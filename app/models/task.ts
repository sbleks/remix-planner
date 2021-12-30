import { db } from "~/models/db.server";
import invariant from "tiny-invariant";
import { formatParamDate } from "~/util/date";

export function getUnassignedTasks(userId: string) {
  return db.task.findMany({
    where: { userId, bucketId: null },
    orderBy: { createdAt: "asc" },
  });
}

export function getBacklog(userId: string) {
  return db.task.findMany({
    where: { userId, date: null },
    orderBy: { createdAt: "asc" },
  });
}

export function getDayTasks(userId: string, day: string) {
  return db.task.findMany({
    where: { userId, date: day },
    orderBy: { createdAt: "asc" },
  });
}

export type CalendarStats = Awaited<ReturnType<typeof getCalendarStats>>;

export async function getTotalCountsByDate(
  userId: string,
  start: Date,
  end: Date
) {
  let result = await db.task.groupBy({
    by: ["date"],
    orderBy: { date: "asc" },
    _count: {
      date: true,
    },
    where: {
      userId: userId,
      date: {
        gt: formatParamDate(start),
        lt: formatParamDate(end),
      },
    },
  });

  return result
    .map((group) => {
      invariant(
        group.date,
        "expected group.date (being one on one makes me nervous)"
      );
      return {
        date: group.date,
        count: group._count.date,
      };
    })
    .reduce((map, stat) => {
      map[stat.date] = stat.count;
      return map;
    }, {} as { [date: string]: number });
}

export async function getCompletedCountsByDate(
  userId: string,
  start: Date,
  end: Date
) {
  let result = await db.task.groupBy({
    by: ["date"],
    orderBy: { date: "asc" },
    _count: {
      date: true,
    },
    where: {
      userId: userId,
      complete: true,
      date: {
        gt: formatParamDate(start),
        lt: formatParamDate(end),
      },
    },
  });

  return result
    .map((group) => {
      invariant(
        group.date,
        "expected group.date (being one on one makes me nervous)"
      );
      return {
        date: group.date,
        count: group._count.date,
      };
    })
    .reduce((map, stat) => {
      map[stat.date] = stat.count;
      return map;
    }, {} as { [date: string]: number });
}

export async function getCalendarStats(userId: string, start: Date, end: Date) {
  let [total, incomplete] = await Promise.all([
    getTotalCountsByDate(userId, start, end),
    getCompletedCountsByDate(userId, start, end),
  ]);

  return { total, incomplete };
}

export function markComplete(id: string) {
  return db.task.update({
    where: { id },
    data: { complete: true },
  });
}

export function createOrUpdateTask(
  userId: string,
  id: string,
  name?: string,
  date?: string
) {
  name ||= "";
  return db.task.upsert({
    where: { id },
    create: { name, id, userId, date },
    update: { name, id },
  });
}

export function markIncomplete(id: string) {
  return db.task.update({
    where: { id },
    data: { complete: false },
  });
}

export function addDate(id: string, date: string) {
  return db.task.update({
    where: { id },
    data: { date },
  });
}

export function removeDate(id: string) {
  return db.task.update({
    where: { id },
    data: { date: null },
  });
}

export function deleteTask(id: string) {
  return db.task.delete({ where: { id } });
}
