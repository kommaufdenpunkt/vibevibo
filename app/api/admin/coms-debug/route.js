import { NextResponse } from "next/server";
import { isAdminRequest, adminEnabled } from "@/lib/admin";
import * as DB from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET — RAW Coms-Dump zur Diagnose. Admin-only.
export async function GET(req) {
  if (!adminEnabled()) return NextResponse.json({ error: "admin disabled" }, { status: 503 });
  if (!isAdminRequest(req)) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const result = {
    timestamp: new Date().toISOString(),
    counts: {},
    listResults: {},
    availableFunctions: {},
  };

  // Check welche Funktionen existieren
  for (const fnName of ["listGroups", "listGroupsWithOwner", "listGroupsExtended", "getMyGroups", "COM_CATEGORIES"]) {
    result.availableFunctions[fnName] = typeof DB[fnName];
  }

  // listGroups
  try {
    const all = DB.listGroups();
    result.counts.listGroups = all.length;
    result.listResults.listGroups = all.slice(0, 5);
  } catch (e) {
    result.listResults.listGroupsError = e.message;
  }

  // listGroupsWithOwner
  try {
    if (typeof DB.listGroupsWithOwner === "function") {
      const all = DB.listGroupsWithOwner();
      result.counts.listGroupsWithOwner = all.length;
      result.listResults.listGroupsWithOwner = all.slice(0, 5);
    }
  } catch (e) {
    result.listResults.listGroupsWithOwnerError = e.message;
  }

  // listGroupsExtended
  try {
    if (typeof DB.listGroupsExtended === "function") {
      const all = DB.listGroupsExtended({});
      result.counts.listGroupsExtended = all.length;
      result.listResults.listGroupsExtended = all.slice(0, 5);
    }
  } catch (e) {
    result.listResults.listGroupsExtendedError = e.message;
  }

  // getMyGroups für admin user (id=1)
  try {
    const mine = DB.getMyGroups(1);
    result.counts.getMyGroupsForId1 = mine.length;
    result.listResults.getMyGroupsForId1 = mine;
  } catch (e) {
    result.listResults.getMyGroupsForId1Error = e.message;
  }

  return NextResponse.json(result, { headers: { "Content-Type": "application/json; charset=utf-8" } });
}
