import prisma from "../prisma/client.prisma";


import cron from "node-cron";

// Run every minute
cron.schedule("* * * * *", async () => {

  console.log(
    "Running reservation expiry cleanup..."
  );
    try {

      // Find expired pending reservations
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

            // LOCK reservation row
            const reservationRows =
              await tx.$queryRaw<any[]>`
                SELECT *
                FROM "Reservation"
                WHERE id = ${reservation.id}
                FOR UPDATE
              `;

            const lockedReservation =
              reservationRows[0];

            // Reservation may already
            // be confirmed/released
            if (
              !lockedReservation ||
              lockedReservation.status !==
                "PENDING"
            ) {

              return;
            }

            // LOCK inventory row
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

            // Return reserved stock
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

            // Mark reservation released
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