/*
  Warnings:

  - You are about to drop the column `module` on the `Permission` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Permission" DROP COLUMN "module",
ADD COLUMN     "moduleName" VARCHAR(500) NOT NULL DEFAULT '';
