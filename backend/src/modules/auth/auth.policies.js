import { RESOURCES } from "../../constants/resources.js";
import { ACTIONS } from "../../constants/actions.js";

const R = RESOURCES;
const A = ACTIONS;

export const rolePolicies = {
  super_admin: [{ resource: "*", actions: ["*"], scope: "all" }],

  admin: [
    { resource: R.FACILITY, actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE], scope: "assigned" },
    {
      resource: R.FACILITY,
      actions: [A.CLOSE_FACILITY_AUDIT, A.REOPEN_FACILITY_AUDIT],
      scope: "assigned",
    },
    {
      resource: R.UTILITY_ACCOUNT,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.UTILITY_AUDIT_FLOW,
      actions: [A.SUBMIT_AUDIT_STEP, A.ALLOW_AUDIT_STEP],
      scope: "assigned",
    },
    {
      resource: R.UTILITY_BILLING,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.UTILITY_TARIFF,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.SOLAR_PLANT,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.SOLAR_GENERATION,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.DG_SET,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.DG_AUDIT,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.TRANSFORMER,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.TRANSFORMER_AUDIT,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.PUMP,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.PUMP_AUDIT,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.HVAC_AUDIT,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.AC_AUDIT,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.LIGHTING_AUDIT,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.FAN_AUDIT,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.LUX_MEASUREMENT,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.MISC_LOAD_AUDIT,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.REPORT,
      actions: [
        A.CREATE,
        A.READ,
        A.UPDATE,
        A.DELETE,
        A.EXPORT,
        A.DOWNLOAD,
        A.GENERATE_REPORT,
        A.VIEW_REPORT,
      ],
      scope: "assigned",
    },
    {
      resource: R.USER,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "all",
    },
    { resource: R.USER_PERFORMANCE, actions: [A.READ], scope: "all" },
    { resource: R.DASHBOARD, actions: [A.READ], scope: "all" },
    { resource: R.ANALYTICS, actions: [A.READ], scope: "all" },
    { resource: R.FILE, actions: [A.READ, A.DOWNLOAD, A.VIEW_DOCUMENT], scope: "all" },
    {
      resource: R.COMPANY,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "all",
    },
    {
      resource: R.QUOTATION,
      actions: [A.CREATE, A.READ, A.UPDATE],
      scope: "all",
    },
    {
      resource: R.EXPRESSION_OF_INTEREST,
      actions: [A.CREATE, A.READ, A.UPDATE],
      scope: "all",
    },
    {
      resource: R.TERMS_CONDITIONS,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "all",
    },
    // Team Manager permissions
    {
      resource: R.TEAM,
      actions: [A.CREATE, A.READ, A.UPDATE, A.ASSIGN, A.MOVE_USER, A.DEACTIVATE_USER],
      scope: "all",
    },
    // Work Planner permissions
    {
      resource: R.WORK_PLAN,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE, A.APPROVE, A.REJECT],
      scope: "all",
    },
    {
      resource: R.WORK_TASK,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE, A.ASSIGN],
      scope: "all",
    },
    // Expense Manager permissions
    {
      resource: R.EXPENSE,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE, A.APPROVE, A.REJECT, A.REIMBURSE],
      scope: "all",
    },
    {
      resource: R.EXPENSE_POLICY,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "all",
    },
  ],

  manager: [
    {
      resource: R.FACILITY,
      actions: [
        A.READ,
        A.UPDATE,
        A.ASSIGN,
        A.CLOSE_FACILITY_AUDIT,
        A.REOPEN_FACILITY_AUDIT,
      ],
      scope: "assigned",
    },
    {
      resource: R.UTILITY_ACCOUNT,
      actions: [A.CREATE, A.READ, A.UPDATE],
      scope: "assigned",
    },
    {
      resource: R.UTILITY_AUDIT_FLOW,
      actions: [A.SUBMIT_AUDIT_STEP, A.ALLOW_AUDIT_STEP],
      scope: "assigned",
    },
    {
      resource: R.UTILITY_BILLING,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.UTILITY_TARIFF,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.SOLAR_PLANT,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.SOLAR_GENERATION,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.DG_SET,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.DG_AUDIT,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.TRANSFORMER,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.TRANSFORMER_AUDIT,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.PUMP,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.PUMP_AUDIT,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.HVAC_AUDIT,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.AC_AUDIT,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.LIGHTING_AUDIT,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.FAN_AUDIT,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.LUX_MEASUREMENT,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.MISC_LOAD_AUDIT,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.REPORT,
      actions: [
        A.CREATE,
        A.READ,
        A.UPDATE,
        A.DELETE,
        A.EXPORT,
        A.DOWNLOAD,
        A.GENERATE_REPORT,
        A.VIEW_REPORT,
      ],
      scope: "assigned",
    },
    {
      resource: R.FILE,
      actions: [A.READ, A.DOWNLOAD, A.VIEW_DOCUMENT],
      scope: "all",
    },
    { resource: R.DASHBOARD, actions: [A.READ], scope: "all" },
    { resource: R.ANALYTICS, actions: [A.READ], scope: "all" },
    { resource: R.COMPANY, actions: [A.READ], scope: "all" },
    {
      resource: R.QUOTATION,
      actions: [A.CREATE, A.READ, A.UPDATE],
      scope: "all",
    },
    {
      resource: R.EXPRESSION_OF_INTEREST,
      actions: [A.CREATE, A.READ, A.UPDATE],
      scope: "all",
    },
    { resource: R.TERMS_CONDITIONS, actions: [A.READ], scope: "all" },
    // Team Manager — view only within assigned hierarchy
    { resource: R.TEAM, actions: [A.READ], scope: "assigned" },
    // Work Planner — create/manage for self and direct reports
    {
      resource: R.WORK_PLAN,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE, A.APPROVE, A.REJECT],
      scope: "assigned",
    },
    {
      resource: R.WORK_TASK,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE, A.ASSIGN],
      scope: "assigned",
    },
    // Expense Manager — view/approve team expenses
    {
      resource: R.EXPENSE,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE, A.APPROVE, A.REJECT, A.SUBMIT],
      scope: "assigned",
    },
    { resource: R.EXPENSE_POLICY, actions: [A.READ], scope: "all" },
  ],

  auditor: [
    {
      resource: R.FACILITY,
      actions: [A.READ, A.UPDATE, A.CLOSE_FACILITY_AUDIT],
      scope: "assigned",
    },
    { resource: R.FACILITY, actions: [A.DELETE], scope: "own" },
    {
      resource: R.UTILITY_ACCOUNT,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.UTILITY_AUDIT_FLOW,
      actions: [A.SUBMIT_AUDIT_STEP],
      scope: "assigned",
    },
    {
      resource: R.UTILITY_BILLING,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.UTILITY_TARIFF,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.SOLAR_PLANT,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.SOLAR_GENERATION,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.DG_SET,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.DG_AUDIT,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.TRANSFORMER,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.TRANSFORMER_AUDIT,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.PUMP,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.PUMP_AUDIT,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.HVAC_AUDIT,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.AC_AUDIT,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.LIGHTING_AUDIT,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.FAN_AUDIT,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.LUX_MEASUREMENT,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.MISC_LOAD_AUDIT,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
      scope: "assigned",
    },
    {
      resource: R.REPORT,
      actions: [
        A.READ,
        A.CREATE,
        A.UPDATE,
        A.DELETE,
        A.EXPORT,
        A.DOWNLOAD,
        A.GENERATE_REPORT,
        A.VIEW_REPORT,
      ],
      scope: "assigned",
    },
    {
      resource: R.FILE,
      actions: [A.READ, A.DOWNLOAD, A.VIEW_DOCUMENT],
      scope: "all",
    },
    { resource: R.USER_PROFILE, actions: [A.READ, A.UPDATE], scope: "own" },
    { resource: R.USER_PERFORMANCE, actions: [A.READ], scope: "own" },
    { resource: R.DASHBOARD, actions: [A.READ], scope: "assigned" },
    { resource: R.COMPANY, actions: [A.READ], scope: "all" },
    {
      resource: R.QUOTATION,
      actions: [A.CREATE, A.READ, A.UPDATE],
      scope: "all",
    },
    {
      resource: R.EXPRESSION_OF_INTEREST,
      actions: [A.CREATE, A.READ, A.UPDATE],
      scope: "all",
    },
    // Work Planner — own work plans and tasks only
    {
      resource: R.WORK_PLAN,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE, A.SUBMIT],
      scope: "own",
    },
    { resource: R.WORK_TASK, actions: [A.READ, A.UPDATE], scope: "own" },
    // Expense Manager — own expenses only
    {
      resource: R.EXPENSE,
      actions: [A.CREATE, A.READ, A.UPDATE, A.DELETE, A.SUBMIT],
      scope: "own",
    },
    { resource: R.EXPENSE_POLICY, actions: [A.READ], scope: "all" },
  ],
};
