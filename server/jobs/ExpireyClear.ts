import prisma from "../prisma/client.prisma";


import cron from "node-cron";

cron.schedule("* * * * *", async () => {

  console.log(
    "Running reservation expiry cleanup..."
  );
    try{
      const expiredReservations =
        await prisma.reservation.findMany({
          where: {
            status: "PENDING",
            expiresAt: {
              lt: new Date(),
            },
          },
        });
      console.log(
        `Found ${expiredReservations.length} expired reservations`
      );
      for (const reservation of expiredReservations) {
        await prisma.$transaction(
          async (tx) => {
            const reservationRows =
              await tx.$queryRaw<any[]>`
                SELECT *
                FROM "Reservation"
                WHERE id = ${reservation.id}
                FOR UPDATE
              `;
            const lockedReservation =
              reservationRows[0];
            if (
              !lockedReservation ||
              lockedReservation.status !==
                "PENDING"
            ){return;}
            const inventoryRows =
              await tx.$queryRaw<any[]>`
                SELECT *
                FROM "Inventory"
                WHERE id =
                  ${lockedReservation.inventoryId}
                FOR UPDATE
              `;
            const inventory =
              inventoryRows[0];
            if (!inventory) {
              return;
            }
            await tx.inventory.update({
              where: {
                id: inventory.id,
              },
              data: {
                reservedStock: {
                  decrement:
                    lockedReservation.quantity,
                },
              },
            });
            await tx.reservation.update({
              where: {
                id: lockedReservation.id,
              },
              data: {
                status: "RELEASED",
              },
            });
            console.log(
              `Released reservation ${lockedReservation.id}`
            );
          }
        );
      }

    } catch (error) {

      console.log(
        "Error releasing expired reservations:",
        error
      );
    }
});