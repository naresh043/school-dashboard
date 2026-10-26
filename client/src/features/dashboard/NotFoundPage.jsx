import { Link } from "react-router-dom";
import { ChevronRight, Search } from "lucide-react";
import AppShell from "../../components/layout/AppShell.jsx";
export default function NotFoundPage() {
  return (
    <AppShell
      title="Page not found"
      subtitle="We couldn’t find the page you were looking for."
    >
      <div className="not-found">
        <div className="empty-icon">
          <Search size={23} />
        </div>
        <h2>That page wandered off</h2>
        <p>Check the address or return to your school overview.</p>
        <Link className="primary-button" to="/dashboard">
          Back to dashboard <ChevronRight size={16} />
        </Link>
      </div>
    </AppShell>
  );
}


