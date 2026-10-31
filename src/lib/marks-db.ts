import "server-only";
import { db } from "@/db";
import { createMarks } from "./marks";

export const { mark, unmark, markedKeys, recent } = createMarks(db);
