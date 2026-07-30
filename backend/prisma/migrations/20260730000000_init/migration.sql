-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "fontiranId" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FontFamily" (
    "id" TEXT NOT NULL,
    "fontiranId" TEXT,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "isVariable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FontFamily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FontFace" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 400,
    "style" TEXT NOT NULL DEFAULT 'normal',
    "isVariable" BOOLEAN NOT NULL DEFAULT false,
    "axesJson" JSONB,
    "featuresJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FontFace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFont" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,

    CONSTRAINT "UserFont_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Design" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "document" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Design_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_fontiranId_key" ON "User"("fontiranId");

-- CreateIndex
CREATE UNIQUE INDEX "FontFamily_fontiranId_key" ON "FontFamily"("fontiranId");

-- CreateIndex
CREATE UNIQUE INDEX "FontFace_familyId_fileName_key" ON "FontFace"("familyId", "fileName");

-- CreateIndex
CREATE UNIQUE INDEX "UserFont_userId_familyId_key" ON "UserFont"("userId", "familyId");

-- CreateIndex
CREATE UNIQUE INDEX "Design_userId_key" ON "Design"("userId");

-- AddForeignKey
ALTER TABLE "FontFace" ADD CONSTRAINT "FontFace_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "FontFamily"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFont" ADD CONSTRAINT "UserFont_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFont" ADD CONSTRAINT "UserFont_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "FontFamily"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Design" ADD CONSTRAINT "Design_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
