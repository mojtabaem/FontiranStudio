import { Controller, Get, Header, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AdminTokenGuard } from './admin-token.guard';

@Controller()
export class AdminPageController {
  @Get('admin')
  @Header('Content-Type', 'text/html; charset=utf-8')
  dashboard(@Res() res: Response) {
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Fontiran Studio Admin</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; max-width: 720px; }
    code { background: #f2f2f2; padding: 0.1rem 0.35rem; }
    input, button { font: inherit; padding: 0.4rem 0.6rem; }
    pre { background: #111; color: #eee; padding: 1rem; overflow: auto; }
  </style>
</head>
<body>
  <h1>Fontiran Studio Admin</h1>
  <p>Enter admin token and load data from the API.</p>
  <p>
    <label>Token <input id="token" type="password" placeholder="ADMIN_TOKEN" style="width: 280px" /></label>
    <button id="load">Load</button>
  </p>
  <h2>Fonts</h2>
  <pre id="fonts">—</pre>
  <h2>Users</h2>
  <pre id="users">—</pre>
  <h2>Designs</h2>
  <pre id="designs">—</pre>
  <script>
    const tokenInput = document.getElementById('token');
    tokenInput.value = localStorage.getItem('adminToken') || '';
    document.getElementById('load').onclick = async () => {
      const token = tokenInput.value.trim();
      localStorage.setItem('adminToken', token);
      const headers = { 'x-admin-token': token };
      for (const key of ['fonts', 'users', 'designs']) {
        const el = document.getElementById(key);
        el.textContent = 'Loading…';
        try {
          const res = await fetch('/api/admin/' + key, { headers });
          const data = await res.json();
          el.textContent = JSON.stringify(data, null, 2);
        } catch (e) {
          el.textContent = String(e);
        }
      }
    };
  </script>
</body>
</html>`;
    res.send(html);
  }
}

@Controller('admin')
@UseGuards(AdminTokenGuard)
export class AdminApiController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('fonts')
  fonts() {
    return this.prisma.fontFamily.findMany({
      include: { faces: true, _count: { select: { users: true } } },
      orderBy: { name: 'asc' },
    });
  }

  @Get('users')
  users() {
    return this.prisma.user.findMany({
      include: {
        fonts: { include: { family: true } },
        design: { select: { id: true, updatedAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('designs')
  designs() {
    return this.prisma.design.findMany({
      include: {
        user: { select: { id: true, phone: true, email: true, fontiranId: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
