import { useOutletContext } from "react-router-dom";
import { AdminOverviewContent } from "./AdminLayout";

function AdminOverview() {
    const context = useOutletContext() || {};
    
    return (
        <AdminOverviewContent 
            stats={context.stats || {}}
            enhancedStats={context.enhancedStats}
            systemHealth={context.systemHealth}
        />
    );
}

export default AdminOverview;