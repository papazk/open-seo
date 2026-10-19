// Maintainer-owned allowlist. Excluded sites are intentionally absent.
export const targets = [
  {
    domain: "optikarodenstock.mk",
    projectId: "6d029846-db91-4430-86f1-2b53efd2302f",
    propertyId: "557901299",
    expectedEvents: ["booking_confirmed"],
  },
  {
    domain: "schwimmbadbausalzburg.at",
    projectId: "9c956960-80c1-46df-960f-130a64ef4713",
    propertyId: "557907363",
    expectedEvents: ["generate_lead"],
  },
  {
    domain: "schwimmbadbauniederosterreich.at",
    projectId: "32d6f212-ac46-4250-bdee-3478c698fecb",
    propertyId: "557916752",
    expectedEvents: ["generate_lead"],
  },
  {
    domain: "schwimmbadbaukarnten.at",
    projectId: "360ca3fe-a561-48fd-97c9-0d3ee9f26043",
    propertyId: "557921603",
    expectedEvents: ["generate_lead"],
  },
  {
    domain: "poolbauwels.at",
    projectId: "66848e14-e3b2-47e6-8d59-3f042e4aa0a5",
    propertyId: "557871707",
    expectedEvents: ["generate_lead"],
  },
  {
    domain: "poolbauniederosterreich.at",
    projectId: "9153b5a0-e2f9-4683-8d1c-a2a8a43c5e2c",
    propertyId: "557884121",
    expectedEvents: ["generate_lead"],
  },
  {
    domain: "poolbaustpolten.at",
    projectId: "8caded80-8852-4099-946f-e4f3bc73a20f",
    propertyId: "557907853",
    expectedEvents: ["generate_lead"],
  },
  {
    domain: "poolbaueroberosterreich.at",
    projectId: "06423d28-3f6e-486c-9fc2-e947a32786c0",
    propertyId: "557924720",
    expectedEvents: ["generate_lead"],
  },
  {
    domain: "mybatonrougehandyman.com",
    projectId: "172340ba-674a-466e-8848-e7e074b1b67f",
    propertyId: "557875841",
    expectedEvents: ["generate_lead"],
  },
  {
    domain: "poolbauwien.at",
    projectId: "f306059f-d1fb-4d88-8c45-891501184575",
    propertyId: "556800314",
    expectedEvents: ["form_submission", "qualified_enquiry"],
  },
  {
    domain: "poolbauoberosterreich.at",
    projectId: "a3d3e90c-b9e6-4d91-ae3f-ad6f79296cab",
    propertyId: "556797074",
    expectedEvents: ["form_submission", "qualified_enquiry"],
  },
] as const;
