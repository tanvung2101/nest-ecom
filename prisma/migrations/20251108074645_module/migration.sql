/*
  Warnings:

  - You are about to drop the column `moduleName` on the `Permission` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Permission" DROP COLUMN "moduleName",
ADD COLUMN     "module" VARCHAR(500) NOT NULL DEFAULT '';
