-- CreateTable
CREATE TABLE "DissolutionFlowStep" (
    "id" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "phaseId" INTEGER NOT NULL,
    "stepId" INTEGER NOT NULL,
    "stepName" TEXT NOT NULL,
    "responsibleParty" JSONB NOT NULL,
    "objetive" TEXT,
    "dependencies" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "totalTasks" INTEGER NOT NULL,
    "tasks" JSONB,

    CONSTRAINT "DissolutionFlowStep_pkey" PRIMARY KEY ("id")
);
