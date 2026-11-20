/**
 * MDIP API client. Split by area; import from "@/lib/api" as before.
 */

export {
  SESSION_EXPIRED_EVENT,
  setOnPremisesMode,
  checkApiHealth,
  type AuthUser,
} from "./client";
export {
  loginUser,
  registerUser,
  loginWithGoogle,
  logoutUser,
  subscribeAuth,
} from "./auth";
export {
  ScheduleUploadError,
  inspectScheduleFile,
  uploadScheduleFile,
  fetchDelayRiskPrediction,
} from "./schedule";
export {
  fetchDecisionActions,
  flagDecisionAction,
  fetchAuditLog,
} from "./decisions";
export {
  downloadOperationalExport,
  fetchPerformanceData,
  fetchLiveOverviewKpis,
} from "./dashboard";
export {
  fetchCopilotStatus,
  askManufacturingCopilot,
  fetchKnowledgeDocs,
  ingestKnowledgeDoc,
} from "./copilot";
export {
  fetchIRoomMaterials,
  fetchIRoomProjects,
  fetchIRoomDrawings,
  fetchIRoomQuotations,
  fetchIRoomOperations,
  ingestIRoomRecord,
} from "./iroom";
export {
  type MlModelCard,
  DEFAULT_MODEL_CARD,
  fetchMlModelCard,
} from "./model";
