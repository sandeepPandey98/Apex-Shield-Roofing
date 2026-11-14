export interface ServiceItem {
  id: string;
  category: "Inspection" | "Repair" | "Replacement";
  title: string;
  price: number;
  priceLabel: string;
  planId: string;
  description: string;
  features: string[];
  isDeposit: boolean;
}
export const SITE_CONFIG = {
  companyName: "Apex Shield Roofing & Exteriors",
  shortName: "APEX SHIELD",
  tagline: "A better roof. A better way.",
  phone: "(512) 555-0194",
  phoneHref: "+15125550194",
  email: "estimates@apexshieldroofing.example",
  licenseNumber: "TX-ROOF-884920",
  demoBrand: true,
  serviceArea: {
    state: "Texas",
    cities: [
      "Austin",
      "Round Rock",
      "Cedar Park",
      "Georgetown",
      "Lakeway",
      "Pflugerville",
    ],
    zipCodes: ["78701", "78704", "78745", "78664", "78613", "78626", "78734"],
  },
  financing: {
    headline: "A stronger roof. A little more flexibility.",
    subheadline:
      "Explore payment options at Whop checkout. Available methods depend on your eligibility, location, and order.",
  },
  services: [
    {
      id: "roof-inspection",
      category: "Inspection",
      title: "Know your roof. Inside and out.",
      price: 149,
      priceLabel: "$149 flat fee",
      planId: process.env.NEXT_PUBLIC_PLAN_INSPECTION || "",
      description:
        "A 21-point drone & attic inspection. Get the full picture before you make a decision.",
      features: [
        "4K drone roof scan",
        "Attic ventilation & decking check",
        "Same-day photo report",
      ],
      isDeposit: false,
    },
    {
      id: "flat-rate-repair",
      category: "Repair",
      title: "Small leak. Sorted.",
      price: 399,
      priceLabel: "$399 flat rate",
      planId: process.env.NEXT_PUBLIC_PLAN_FLAT_RATE || "",
      description:
        "An emergency leak & flashing tune-up, with a clear scope and an upfront price.",
      features: [
        "Up to 2 pipe boot replacements",
        "Chimney & valley sealing",
        "2-year workmanship warranty",
      ],
      isDeposit: false,
    },
    {
      id: "replacement-deposit",
      category: "Replacement",
      title: "Your next roof starts here.",
      price: 500,
      priceLabel: "$500 project deposit",
      planId: process.env.NEXT_PUBLIC_PLAN_DEPOSIT || "",
      description:
        "Reserve your roof replacement. Your deposit goes toward the final project balance.",
      features: [
        "Dedicated project manager",
        "100% credited to your final invoice",
        "Secure card-on-file billing",
      ],
      isDeposit: true,
    },
  ] satisfies ServiceItem[],
  reviews: [
    {
      author: "Marcus T.",
      city: "Round Rock, TX",
      project: "Roof replacement",
      quote:
        "Booked the drone inspection online, got the photo report that afternoon, and locked our replacement crew with a $500 deposit.",
    },
    {
      author: "Elena R.",
      city: "Austin, TX",
      project: "Leak & flashing repair",
      quote:
        "No pushy sales pitch. Paid the flat-rate repair online and they fixed our chimney flashing the next morning.",
    },
    {
      author: "David & Sarah K.",
      city: "Cedar Park, TX",
      project: "Hail damage replacement",
      quote:
        "Transparent from estimate to final invoice. Having our card on file made closing out the final balance effortless.",
    },
  ],
  faqs: [
    {
      id: "final-balance",
      question: "How do I pay the final balance?",
      answer:
        "After the work and final walkthrough are complete, we invoice the agreed project total minus your deposit. You can pay through the secure Whop invoice link. If you authorized an eligible saved payment method, we can use it to collect your agreed remaining balance.",
    },
    {
      question: "What happens after I book an inspection?",
      answer:
        "Our team contacts you to arrange access and a convenient visit. We inspect the roof and attic, document what we find, and walk you through your photo report and next steps.",
    },
    {
      question: "Does the $399 repair cover every kind of leak?",
      answer:
        "The flat rate covers the listed pipe boot, chimney, and valley sealing work. If damage falls outside that scope, we explain the options and agree on a written estimate before additional work.",
    },
    {
      question: "How does the $500 replacement deposit work?",
      answer:
        "The deposit is applied in full to your agreed project price. We confirm materials and scheduling directly. Your remaining balance is invoiced after completion and final walkthrough.",
    },
    {
      question: "Will my card be saved for the final balance?",
      answer:
        "For a replacement deposit, you can authorize Whop to securely save an eligible payment method for the agreed final balance. Card details never pass through our website. Financing methods may not support saved-card billing.",
    },
    {
      question: "Can I pay over time?",
      answer:
        "Whop may offer Klarna, Afterpay, or Splitit when enabled by the business and available for your order. Approval, terms, and availability are determined by the provider at checkout.",
    },
  ],
};
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";


// Sample details are prefilled only in demo/sandbox environments.
export const DEMO_ESTIMATE = {
  fullName: "Jamie Miller",
  email: "jamie.miller@example.com",
  phone: "(512) 555-0123",
  address: "123 Oak Street, Austin, TX",
  zipCode: "78701",
  notes: "A few shingles are missing after a recent storm, and there is a small water stain near the chimney. I would like a roof inspection and a replacement estimate.",
};


export const DEMO_BILLING_ADDRESS = {
  line1: "123 Oak Street", city: "Austin", state: "TX", postal_code: "78701", country: "US" as const,
};
