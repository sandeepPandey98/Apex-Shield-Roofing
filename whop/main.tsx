import { ContractorAdmin } from "../components/ContractorAdmin";
import { createRoot } from "react-dom/client";
import { RoofingSite } from "../components/RoofingSite";
import { Receipt } from "../app/checkout/complete/page";
import { CheckoutErrorBoundary } from "../components/CheckoutErrorBoundary";
import "../app/globals.css";
createRoot(document.getElementById("root")!).render(
  <CheckoutErrorBoundary>
    {location.pathname === "/checkout/complete" ? <Receipt /> : /^\/(admin|embed)\/(tracking|leads|invoices)\/?$/.test(location.pathname) ? <ContractorAdmin embed={location.pathname.startsWith("/embed/")} kind={location.pathname.split("/")[2] as "tracking" | "leads" | "invoices"} /> : <RoofingSite />}
  </CheckoutErrorBoundary>,
);
