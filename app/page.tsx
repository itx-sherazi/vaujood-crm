import {
  listPropertiesPaginated,
} from "./properties-actions";
import {
  listLeadsPaginated,
  listLeadsForKanban,
} from "./leads-actions";
import CrmShell from "./crm-shell";

const PAGE_SIZE = 50;
const KANBAN_LEADS_LIMIT = 1000;

export default async function Home() {
  const [
    { properties, total: totalProperties },
    { leads, total: totalLeads },
    kanbanLeads,
  ] = await Promise.all([
    listPropertiesPaginated(1, PAGE_SIZE),
    listLeadsPaginated(1, PAGE_SIZE),
    listLeadsForKanban(KANBAN_LEADS_LIMIT),
  ]);

  return (
    <CrmShell
      initialProperties={properties}
      totalProperties={totalProperties}
      initialLeads={leads}
      totalLeads={totalLeads}
      kanbanLeads={kanbanLeads}
      pageSize={PAGE_SIZE}
    />
  );
}

