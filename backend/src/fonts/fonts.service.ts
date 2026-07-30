import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from 'fs';
import * as path from 'path';
import * as opentype from 'opentype.js';
import { PrismaService } from '../prisma/prisma.service';

const FONT_EXTENSIONS = new Set(['.ttf', '.otf', '.woff', '.woff2']);

type AxisInfo = {
  tag: string;
  name: string;
  min: number;
  max: number;
  default: number;
};

type ParsedFace = {
  familyName: string;
  fileName: string;
  filePath: string;
  weight: number;
  style: string;
  isVariable: boolean;
  axes: AxisInfo[];
  features: string[];
};

@Injectable()
export class FontsService implements OnModuleInit {
  private readonly logger = new Logger(FontsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    try {
      await this.scanAndUpsertFonts();
    } catch (error) {
      this.logger.error(
        `Font scan failed: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  async listEntitledFamilies(userId: string) {
    const entitlements = await this.prisma.userFont.findMany({
      where: { userId },
      include: {
        family: {
          include: {
            faces: { orderBy: [{ weight: 'asc' }, { fileName: 'asc' }] },
          },
        },
      },
      orderBy: { family: { name: 'asc' } },
    });

    return entitlements.map((row) => this.mapFamily(row.family));
  }

  async listCatalog() {
    const families = await this.prisma.fontFamily.findMany({
      include: {
        faces: { orderBy: [{ weight: 'asc' }, { fileName: 'asc' }] },
      },
      orderBy: { name: 'asc' },
    });
    return families.map((family) => this.mapFamily(family));
  }

  async getFaceFile(faceId: string) {
    const face = await this.prisma.fontFace.findUnique({ where: { id: faceId } });
    if (!face || !existsSync(face.filePath)) {
      throw new NotFoundException('Font file not found');
    }
    return {
      stream: createReadStream(face.filePath),
      fileName: face.fileName,
      contentType: this.contentTypeFor(face.fileName),
    };
  }

  private mapFamily(family: {
    id: string;
    fontiranId?: string | null;
    name: string;
    isVariable: boolean;
    faces: Array<{
      id: string;
      fileName: string;
      weight: number;
      style: string;
      isVariable: boolean;
      axesJson: unknown;
      featuresJson: unknown;
    }>;
  }) {
    return {
      id: family.id,
      familyId: family.id,
      fontiranId: family.fontiranId ?? family.id,
      name: family.name,
      isVariable: family.isVariable,
      faces: family.faces.map((face) => ({
        id: face.id,
        fileName: face.fileName,
        weight: face.weight,
        style: face.style,
        isVariable: face.isVariable,
        axes: (face.axesJson as AxisInfo[] | null) ?? [],
        features: (face.featuresJson as string[] | null) ?? [],
        url: `/api/fonts/files/${face.id}`,
      })),
    };
  }

  private async scanAndUpsertFonts() {
    const dir = this.resolveFontsDir();
    if (!dir) {
      this.logger.warn('MOCK_FONTS_DIR not found; skipping font scan');
      return;
    }

    this.logger.log(`Scanning fonts in ${dir}`);
    const files = this.collectFontFiles(dir);
    const parsed: ParsedFace[] = [];

    for (const filePath of files) {
      try {
        parsed.push(this.parseFontFile(filePath));
      } catch (error) {
        this.logger.warn(
          `Skipping ${filePath}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    const byFamily = new Map<string, ParsedFace[]>();
    for (const face of parsed) {
      const key = face.familyName;
      const list = byFamily.get(key) ?? [];
      list.push(face);
      byFamily.set(key, list);
    }

    for (const [familyName, faces] of byFamily) {
      const isVariable = faces.some((f) => f.isVariable);
      const fontiranId = this.slugify(familyName);

      const family = await this.prisma.fontFamily.upsert({
        where: { fontiranId },
        create: {
          fontiranId,
          name: familyName,
          isVariable,
        },
        update: {
          name: familyName,
          isVariable,
        },
      });

      for (const face of faces) {
        await this.prisma.fontFace.upsert({
          where: {
            familyId_fileName: {
              familyId: family.id,
              fileName: face.fileName,
            },
          },
          create: {
            familyId: family.id,
            fileName: face.fileName,
            filePath: face.filePath,
            weight: face.weight,
            style: face.style,
            isVariable: face.isVariable,
            axesJson: face.axes,
            featuresJson: face.features,
          },
          update: {
            filePath: face.filePath,
            weight: face.weight,
            style: face.style,
            isVariable: face.isVariable,
            axesJson: face.axes,
            featuresJson: face.features,
          },
        });
      }
    }

    this.logger.log(
      `Upserted ${byFamily.size} font families (${parsed.length} faces)`,
    );
  }

  private resolveFontsDir(): string | null {
    const configured =
      this.config.get<string>('MOCK_FONTS_DIR') ?? '../mock/fonts';

    const candidates = [
      configured,
      path.isAbsolute(configured)
        ? configured
        : path.join(process.cwd(), configured),
      path.join(process.cwd(), '..', 'mock', 'fonts'),
    ];

    for (const candidate of candidates) {
      if (candidate && existsSync(candidate) && statSync(candidate).isDirectory()) {
        return path.resolve(candidate);
      }
    }
    return null;
  }

  private collectFontFiles(dir: string): string[] {
    const results: string[] = [];
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...this.collectFontFiles(full));
      } else if (FONT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        results.push(full);
      }
    }
    return results;
  }

  private parseFontFile(filePath: string): ParsedFace {
    const buffer = readFileSync(filePath);
    const ab = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    );
    const font = opentype.parse(ab);

    const names = font.names as unknown as Record<
      string,
      { en?: string } | undefined
    >;
    const familyName =
      names.fontFamily?.en ||
      names.preferredFamily?.en ||
      path.basename(filePath, path.extname(filePath));

    const subfamily =
      names.fontSubfamily?.en ||
      names.preferredSubfamily?.en ||
      'Regular';

    const fvar = (font.tables as { fvar?: { axes?: Array<{
      tag: string;
      name?: { en?: string };
      minValue: number;
      maxValue: number;
      defaultValue: number;
    }> } }).fvar;

    const axes: AxisInfo[] = (fvar?.axes ?? []).map((axis) => ({
      tag: axis.tag,
      name: axis.name?.en ?? axis.tag,
      min: axis.minValue,
      max: axis.maxValue,
      default: axis.defaultValue,
    }));

    const isVariable = axes.length > 0;

    const gsub = (font.tables as { gsub?: { features?: Array<{ tag: string }> } })
      .gsub;
    const featureTags = new Set<string>();
    for (const feature of gsub?.features ?? []) {
      if (feature?.tag) {
        featureTags.add(feature.tag);
      }
    }

    const os2 = (font.tables as { os2?: { usWeightClass?: number } }).os2;
    let weight = os2?.usWeightClass ?? 400;
    if (!os2?.usWeightClass) {
      weight = this.weightFromName(subfamily);
    }

    const style = /italic|oblique/i.test(subfamily) ? 'italic' : 'normal';

    return {
      familyName,
      fileName: path.basename(filePath),
      filePath,
      weight,
      style,
      isVariable,
      axes,
      features: [...featureTags].sort(),
    };
  }

  private weightFromName(name: string): number {
    const n = name.toLowerCase();
    if (n.includes('thin')) return 100;
    if (n.includes('extralight') || n.includes('extra light')) return 200;
    if (n.includes('light')) return 300;
    if (n.includes('medium')) return 500;
    if (n.includes('semibold') || n.includes('semi bold') || n.includes('demibold'))
      return 600;
    if (n.includes('extrabold') || n.includes('extra bold') || n.includes('ultrabold'))
      return 800;
    if (n.includes('black') || n.includes('heavy')) return 900;
    if (n.includes('bold')) return 700;
    return 400;
  }

  private slugify(value: string): string {
    return (
      value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\u0600-\u06FF]+/gi, '-')
        .replace(/^-+|-+$/g, '') || 'font'
    );
  }

  private contentTypeFor(fileName: string): string {
    switch (path.extname(fileName).toLowerCase()) {
      case '.otf':
        return 'font/otf';
      case '.woff':
        return 'font/woff';
      case '.woff2':
        return 'font/woff2';
      case '.ttf':
      default:
        return 'font/ttf';
    }
  }
}
