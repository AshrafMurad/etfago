export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV === "production") {
    const { validateProductionEnvironment } = await import("./server/config");
    validateProductionEnvironment();
    const { verifyStorageWritable } = await import("./server/storage/filesystem");
    verifyStorageWritable();
    const { db } = await import("./server/db/prisma");
    await db.$queryRaw`SELECT 1`;
  }
}
