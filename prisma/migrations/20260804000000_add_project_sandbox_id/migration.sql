ALTER TABLE "Project" ADD COLUMN "sandboxId" TEXT;

CREATE UNIQUE INDEX "Project_sandboxId_key" ON "Project"("sandboxId");
