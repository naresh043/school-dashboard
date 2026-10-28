import { AlertCircle, LoaderCircle } from "lucide-react";
import { getApiErrorMessage } from "../../lib/api.js";

export default function ApiFeedback({ loading, error, onRetry, emptyMessage }) {
  if (loading) {
    return <div className="api-feedback" role="status"><LoaderCircle className="api-feedback-spinner" size={20} /><span>Loading school data…</span></div>;
  }
  if (error) {
    return (
      <div className="api-feedback api-feedback-error" role="alert">
        <AlertCircle size={19} />
        <span>{getApiErrorMessage(error, "The school server could not be reached. No sample data has been substituted.")}</span>
        {onRetry && <button className="text-button" type="button" onClick={onRetry}>Try again</button>}
      </div>
    );
  }
  if (emptyMessage) return <div className="api-feedback">{emptyMessage}</div>;
  return null;
}
