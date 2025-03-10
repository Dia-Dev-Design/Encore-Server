import data from './data/industries.json';
import { Prisma, PrismaClient } from '@prisma/client';

export const seedDissolutionFlow = async (prismaClient: PrismaClient) => {
  const exist = await prismaClient.dissolutionFlowStep.findFirst();
  if (exist) return;

  const data: Prisma.DissolutionFlowStepCreateInput[] = [
    {
      phase: 'DECISIONS_AND_APPROVALS',
      phaseId: 1,
      stepId: 1,
      stepName: 'Board Decision to Dissolve',
      responsibleParty: ['Board of Directors'],
      objetive: 'Encore should provide agenda templates for meeting',
      duration: '1 week',
      durationDays: 7,
      dependencies:
        'Review existing governing documents to confirm process for making decision',
      totalTasks: 2,
      tasks: [
        {
          pos: 1,
          name: 'Hold a board / shareholder meeting to discuss dissolution',
        },
        {
          pos: 2,
          name: 'Approve a resolution to dissolve the company',
        },
      ],
    },
    {
      phase: 'DECISIONS_AND_APPROVALS',
      phaseId: 1,
      stepId: 2,
      stepName: 'Obtain Shareholder Consent',
      responsibleParty: ['Shareholders'],
      objetive:
        'Encore provides notice and resolution templates. Legal counsel not required unless bylaws specify',
      duration: '2 to 4 weeks',
      durationDays: 28,
      dependencies: 'complete step 1',
      totalTasks: 2,
      tasks: [
        {
          pos: 1,
          name: 'Send notice of a shareholders meeting (as per bylaws/state law)',
        },
        { pos: 2, name: 'Hold the meeting and obtain majority consent' },
      ],
    },
    {
      phase: 'ENGAGE_WITH_ENCORE_AND_IP_TRANSFER',
      phaseId: 2,
      stepId: 3,
      stepName: 'Engage Encore',
      responsibleParty: ['Board of Directors'],
      objetive: null,
      duration: 'after step 2',
      durationDays: 1,
      dependencies: 'complete step 2',
      totalTasks: 2,
      tasks: [
        {
          pos: 1,
          name: 'Officially engage Encore via service agreement',
        },
        { pos: 2, name: 'Define scope and responsibilities' },
      ],
    },
    {
      phase: 'ENGAGE_WITH_ENCORE_AND_IP_TRANSFER',
      phaseId: 2,
      stepId: 4,
      stepName: 'Transfer Unsold IP to Encore',
      responsibleParty: ['Encore', 'Board of Directors'],
      objetive:
        'Encore provides IP transfer templates. Legal counsel may be required to review agreements',
      duration: '1 to 2 weeks',
      durationDays: 14,
      dependencies: 'after step 2',
      totalTasks: 3,
      tasks: [
        {
          pos: 1,
          name: 'Inventory all IP assets',
        },
        {
          pos: 2,
          name: 'Identify IP to be sold and IP to transfer to Encore',
        },
        { pos: 3, name: 'Execute IP transfer agreements to Encore' },
      ],
    },
    {
      phase: 'FILING_AND_NOTIFICATIONS',
      phaseId: 3,
      stepId: 5,
      stepName: 'File Articles of Dissolution',
      responsibleParty: ['Encore'],
      objetive:
        'Legal counsel required for filing. Encore coordinates with legal counsel',
      duration: '1 week',
      durationDays: 7,
      dependencies: 'complete steps 2 and 3',
      totalTasks: 2,
      tasks: [
        {
          pos: 1,
          name: 'Prepare Articles of Dissolution using Encores templates',
        },
        {
          pos: 2,
          name: 'File with the Secretary of State or relevant authority',
        },
      ],
    },
    {
      phase: 'FILING_AND_NOTIFICATIONS',
      phaseId: 3,
      stepId: 6,
      stepName: 'Notify Key Stakeholders Privately',
      responsibleParty: ['Company Management', 'Encore'],
      objetive: 'Encore provides communication templates',
      duration: '1 week',
      durationDays: 7,
      dependencies: 'after step 2',
      totalTasks: 2,
      tasks: [
        {
          pos: 1,
          name: 'Notify key employees, major customers, vendors, and investors confidentially',
        },
        {
          pos: 2,
          name: 'Provide information on the dissolution timeline and next steps',
        },
      ],
    },
    {
      phase: 'PUBLIC_ANNOUNCEMENTS_AND_COMMUNICATIONS',
      phaseId: 4,
      stepId: 7,
      stepName: 'Notify Employees',
      responsibleParty: ['HT Department', 'Encore'],
      objetive:
        'Observe WARN Act (60-day notice) if applicable. Encore assists with communication templates',
      duration: 'Immediate; legal notice periods apply',
      durationDays: 3,
      dependencies: 'after step 6',
      totalTasks: 2,
      tasks: [
        {
          pos: 1,
          name: 'Communicate dissolution to all employees',
        },
        {
          pos: 2,
          name: 'Provide details on final pay, benefits, and severance packages',
        },
      ],
    },
    {
      phase: 'PUBLIC_ANNOUNCEMENTS_AND_COMMUNICATIONS',
      phaseId: 4,
      stepId: 8,
      stepName: 'Communicate with Customers/Vendors',
      responsibleParty: ['Company Management', 'Encore'],
      objetive: 'Encore provides notification templates',
      duration: '1 to 2 weeks',
      durationDays: 14,
      dependencies: 'after step 7',
      totalTasks: 2,
      tasks: [
        {
          pos: 1,
          name: 'Notify customers and vendors about the closure',
        },
        {
          pos: 2,
          name: 'Provide information on fulfilling existing orders and contracts',
        },
      ],
    },
    {
      phase: 'IP_ASSET_DISPOSITION',
      phaseId: 5,
      stepId: 9,
      stepName: 'Develop Asset Disposition Plan',
      duration: '2 weeks',
      durationDays: 14,
      dependencies: 'complete step 3',
      responsibleParty: ['Encore'],
      objetive:
        'Legal counsel required for filing. Encore coordinates with legal counsel',
      totalTasks: 3,
      tasks: [
        {
          pos: 1,
          name: 'Inventory all physical and intangible assets',
        },
        {
          pos: 2,
          name: 'Determine assets for sale and methods (auction, direct sale)',
        },
        {
          pos: 3,
          name: 'Schedule timelines for asset disposition',
        },
      ],
    },
    {
      phase: 'IP_ASSET_DISPOSITION',
      phaseId: 5,
      stepId: 10,
      stepName: 'Market and Sell Assets',
      responsibleParty: ['Encore'],
      objetive:
        'Legal counsel may be required for high-value or complex transactions. Encore provides sales agreement templates',
      duration: '4 to 8 weeks',
      durationDays: 56,
      dependencies: 'complete step 9',
      totalTasks: 3,
      tasks: [
        {
          pos: 1,
          name: 'Market assets using appropriate channels',
        },
        {
          pos: 2,
          name: 'Negotiate with potential buyers',
        },
        {
          pos: 3,
          name: 'Execute sales agreements',
        },
      ],
    },
    {
      phase: 'IP_ASSET_DISPOSITION',
      phaseId: 5,
      stepId: 11,
      stepName: 'Transfer Ownership of Assets',
      responsibleParty: ['Encore'],
      objetive: 'Legal counsel may be required for transfer documentation',
      duration: 'current with step 10',
      durationDays: 56,
      dependencies: 'during step 10', //TODO same that step 10?
      totalTasks: 2,
      tasks: [
        {
          pos: 1,
          name: 'Facilitate the transfer of asset titles and documentation',
        },
        {
          pos: 2,
          name: 'Update records to reflect new ownership',
        },
      ],
    },
    {
      phase: 'SETTLEMENTS_AND_CLOSURES',
      phaseId: 6,
      stepId: 12,
      stepName: 'Collect Outstanding Receivables',
      responsibleParty: ['Finance Derpartment', 'Encore'],
      objetive: 'Encore assists in collection efforts',
      duration: 'ongoing, begins after step 2',
      durationDays: 0,
      dependencies: 'none',
      totalTasks: 2,
      tasks: [
        {
          pos: 1,
          name: 'Identify all outstanding customer accounts',
        },
        {
          pos: 2,
          name: 'Issue invoices and follow up on payments',
        },
      ],
    },
    {
      phase: 'SETTLEMENTS_AND_CLOSURES',
      phaseId: 6,
      stepId: 13,
      stepName: 'Settle Debts and Obligations',
      responsibleParty: ['Finance Derpartment', 'Encore'],
      objetive:
        'Encore coordinates payments. Legal counsel not required unless disputes arise',
      duration: '2 to 4  weeks',
      durationDays: 28,
      dependencies: 'complete steps 10 and 12',
      totalTasks: 3,
      tasks: [
        {
          pos: 1,
          name: 'List all creditors and amounts owed',
        },
        {
          pos: 2,
          name: 'Use proceeds from asset sales and receivables to pay debts',
        },
        {
          pos: 3,
          name: 'Obtain release letters from creditors',
        },
      ],
    },
    {
      phase: 'SETTLEMENTS_AND_CLOSURES',
      phaseId: 6,
      stepId: 14,
      stepName: 'Terminate Contracts and Leases',
      responsibleParty: ['Company Management', 'Encore'],
      objetive:
        'Legal counsel may be required for complex contracts. Observe any penalties or fees for early termination',
      duration: 'As per contract terms (30-60 days notice)',
      durationDays: 60,
      dependencies: 'after step 2',
      totalTasks: 2,
      tasks: [
        {
          pos: 1,
          name: 'Review all contracts for termination clauses',
        },
        {
          pos: 2,
          name: 'Send termination notices using Encores templates',
        },
      ],
    },
    {
      phase: 'SETTLEMENTS_AND_CLOSURES',
      phaseId: 6,
      stepId: 15,
      stepName: 'Release Contracts with Investors',
      responsibleParty: ['Company Management', 'Encore'],
      objetive:
        'Encore provides release templates. Legal counsel may be required for investor agreements',
      duration: '2 weeks',
      durationDays: 14,
      dependencies: 'after step 13',
      totalTasks: 2,
      tasks: [
        {
          pos: 1,
          name: 'Review investment agreements',
        },
        {
          pos: 2,
          name: 'Release or fulfill obligations per contracts',
        },
      ],
    },
    {
      phase: 'SETTLEMENTS_AND_CLOSURES',
      phaseId: 6,
      stepId: 16,
      stepName: 'Close Bank Accounts',
      responsibleParty: ['Finance Deparment', 'Encore'],
      objetive: 'Ensure all checks have cleared',
      duration: '1 week',
      durationDays: 7,
      dependencies: 'after step 13',
      totalTasks: 2,
      tasks: [
        {
          pos: 1,
          name: 'Reconcile all bank accounts',
        },
        {
          pos: 2,
          name: 'Close accounts and obtain closure confirmations',
        },
      ],
    },
    {
      phase: 'SETTLEMENTS_AND_CLOSURES',
      phaseId: 6,
      stepId: 17,
      stepName: 'File Final Tax Returns',
      responsibleParty: ['Finance Deparment', 'Encore'],
      objetive: 'Encore provides guidance. Companies may use tax professionals',
      duration: 'By next taxt deadline',
      durationDays: 0, // to last date
      dependencies: 'after step 16',
      totalTasks: 2,
      tasks: [
        {
          pos: 1,
          name: 'Prepare final federal, state, and local tax returns',
        },
        {
          pos: 2,
          name: 'Pay any taxes owed',
        },
      ],
    },
    {
      phase: 'REGULATORY_COMPLIANCE_AND_RECORD_KEEPING',
      phaseId: 7,
      stepId: 18,
      stepName: 'Cancel Licenses, Permits, Registrations',
      responsibleParty: ['Encore'],
      objetive: 'Encore handles filings',
      duration: '1 to 2 weeks',
      durationDays: 14,
      dependencies: 'after step 14',
      totalTasks: 2,
      tasks: [
        {
          pos: 1,
          name: 'Identify all business licenses, permits, and registrations',
        },
        {
          pos: 2,
          name: 'File cancellation notices',
        },
      ],
    },
    {
      phase: 'REGULATORY_COMPLIANCE_AND_RECORD_KEEPING',
      phaseId: 7,
      stepId: 19,
      stepName: 'Secure and Archive Company Records',
      responsibleParty: ['Encore'],
      objetive: 'Encore coordinates secure storage solutions',
      duration: '2 to 4 weeks',
      durationDays: 28,
      dependencies: 'before step 25',
      totalTasks: 2,
      tasks: [
        {
          pos: 1,
          name: 'Organize all company records (digital and physical)',
        },
        {
          pos: 2,
          name: 'Ensure compliance with legal retention requirements',
        },
      ],
    },

    {
      phase: 'FINAL_STEPS',
      phaseId: 8,
      stepId: 20,
      stepName: 'Change Website Messaging',
      responsibleParty: ['Marketing Departament', 'Encore'],
      objetive: 'Encore assists with messaging',
      duration: '1 to 2 days',
      durationDays: 2,
      dependencies: 'after steps 7 and 8',
      totalTasks: 2,
      tasks: [
        {
          pos: 1,
          name: 'Update the company website to reflect dissolution status',
        },
        {
          pos: 2,
          name: 'Provide contact information for inquiries',
        },
      ],
    },
    {
      phase: 'FINAL_STEPS',
      phaseId: 8,
      stepId: 21,
      stepName: 'Sunset Website and Digital Platforms',
      responsibleParty: ['IT Departament', 'Encore'],
      objetive: 'Ensure compliance with data protection laws',
      duration: 'Scheduled as per communication plan',
      durationDays: 0,
      dependencies: 'after step 20',
      totalTasks: 2,
      tasks: [
        {
          pos: 1,
          name: 'Backup all digital data',
        },
        {
          pos: 2,
          name: 'Deactivate website and social media accounts',
        },
      ],
    },
    {
      phase: 'FINAL_STEPS',
      phaseId: 8,
      stepId: 22,
      stepName: 'Notify Insurance Providers',
      responsibleParty: ['HR Departament', 'Encore'],
      objetive: 'Encore handles notifications',
      duration: '1 week',
      durationDays: 7,
      dependencies: 'after step 13',
      totalTasks: 2,
      tasks: [
        {
          pos: 1,
          name: 'Cancel all insurance policies',
        },
        {
          pos: 2,
          name: 'Confirm any refunds or outstanding premiums',
        },
      ],
    },
    {
      phase: 'FINAL_STEPS',
      phaseId: 8,
      stepId: 23,
      stepName: 'Final Distribution of Remaining Assets',
      responsibleParty: ['Finance Departament', 'Encore'],
      objetive: 'Encore facilitates distributions',
      duration: '2 weeks',
      durationDays: 14,
      dependencies: 'after steps 13, 16 and 17',
      totalTasks: 2,
      tasks: [
        {
          pos: 1,
          name: 'Calculate remaining assets after all obligations',
        },
        {
          pos: 2,
          name: 'Distribute assets to shareholders per ownership percentages',
        },
      ],
    },
    {
      phase: 'FINAL_STEPS',
      phaseId: 8,
      stepId: 24,
      stepName: 'Employee Finalization',
      responsibleParty: ['HR Departament', 'Encore'],
      objetive: 'Ensure compliance with labor laws',
      duration: 'By next regular payday or as required by law',
      durationDays: 0, //set  temp default every last day of month
      dependencies: 'after step 7',
      totalTasks: 2,
      tasks: [
        {
          pos: 1,
          name: 'Issue final paychecks and severance',
        },
        {
          pos: 2,
          name: 'Provide tax documents',
        },
      ],
    },
    {
      phase: 'FINAL_STEPS',
      phaseId: 8,
      stepId: 25,
      stepName: 'Final Meeting with Stakeholders',
      responsibleParty: ['Company Management', 'Encore'],
      objetive: 'Encore organizes the meeting agenda',
      duration: '1',
      durationDays: 1,
      dependencies: 'after all previus steps',
      totalTasks: 2,
      tasks: [
        {
          pos: 1,
          name: 'Hold a closing meeting to summarize the dissolution.',
        },
        {
          pos: 2,
          name: 'Address any final concerns.',
        },
      ],
    },
    {
      phase: 'FINAL_STEPS',
      phaseId: 8,
      stepId: 26,
      stepName: 'Legal Termination of Company',
      responsibleParty: ['Encore'],
      objetive: 'Encore monitors and confirms legal termination',
      duration: '1',
      durationDays: 1,
      dependencies: 'after all previus steps',
      totalTasks: 2,
      tasks: [
        {
          pos: 1,
          name: 'Ensure all legal dissolution requirements are met.',
        },
        {
          pos: 2,
          name: 'Confirm the companys legal termination with state authorities',
        },
      ],
    },
  ];

  await prismaClient.dissolutionFlowStep.createMany({ data });

  console.log('Dissolution flow seeded');
};
