import prisma from "../prisma/client.prisma"
import { Request,Response } from "express";
export const CreateProduct = async(req: Request,res: Response)=>{
  try{
    let {name, description = "", image = ""} = req.body;
    if(!name){
        return res.status(400).json({message: 'please enter name of product'});
    }

    await prisma.product.create({
        data:{
            name: name,
            description: description,
            image: image
        }
    })

    return res.status(201).json({message:'Product successfully created'})
  }catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export const createWareHouse = async(req: Request, res: Response) => {
    let {name, location} = req.body;
    if(!name || !location){
        return res.status(400).json({message: 'please enter name and location of warehouse'});
    };

    await prisma.warehouse.create({
        data:{
            name: name,
            location:location
        }
    })

        return res.status(201).json({message:'Warehouse added successfully'})
}

export const createInventory = async (
  req: Request,
  res: Response
) => {
  try {
    const { ProdcutName, WareHouseName, totalStock } = req.body;

    if (!ProdcutName || !WareHouseName || totalStock == null) {
      return res.status(400).json({
        message:
          "Please provide ProductName, WareHouseName and totalStock",
      });
    }

    // Prevent negative stock
    if (totalStock < 0) {
      return res.status(400).json({
        message: "totalStock cannot be negative",
      });
    }

    // Check product exists
    const product = await prisma.product.findUnique({
      where: {
        name: ProdcutName,
      },
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    // Check warehouse exists
    const warehouse = await prisma.warehouse.findUnique({
      where: {
        name: WareHouseName,
      },
    });

    if (!warehouse) {
      return res.status(404).json({
        message: "Warehouse not found",
      });
    }

    // Check duplicate inventory
    const existingInventory =
      await prisma.inventory.findFirst({
        where: {
          productId: product.id,
          warehouseId: warehouse.id,
        },
      });

    if (existingInventory) {
      return res.status(409).json({
        message:
          "Inventory already exists for this product and warehouse",
      });
    }

    // Create inventory
    const inventory =
      await prisma.inventory.create({
        data: {
          productId: product.id,
          warehouseId: warehouse.id,
          totalStock,
        },
      });

    return res.status(201).json({
      message: "Inventory created successfully",
      inventory,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};




export const getInventory = async(req:Request, res:Response)=>{
  try{
    const products = await prisma.product.findMany({
      include: {
        inventories: {
          include: {
            warehouse: true,
          },
        },
      },
    });
    

    // console.log(products);

    let formatedProducts = products.map((product) =>{
      return {
        id:product.id,
        name: product.name,
        description: product.description,
        image: product.image,
        stocks:product.inventories.map((inventory)=>({
          inventoryId: inventory.id,
          warehousename: inventory.warehouse.name,
          stocks:inventory.totalStock - inventory.reservedStock
        }))
      }
    })

    return res.status(200).json({
      products:formatedProducts
    })
  }catch(err){
    console.log(err);
    res.status(500).json({message: "Internal server error" });
  }
}



export const getWareHouse = async(req:Request, res: Response) =>{
  try{
    let warehouses = prisma.warehouse.findMany();
    return res.status(200).json({
      warehouses
    })
  }catch(err){
    console.log(err);
    res.status(500).json({message: "Internal server error" });
  }
}


export const reserveStock = async(req:Request, res:Response) =>{
  try{
  let {inventoryId, quantity} = req.body;
   if (!inventoryId || quantity == null) {
      return res.status(400).json({
        message:
          "Please provide inventoryId and quantity",
      });
    }
    if (
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      return res.status(400).json({
        message:
          "Quantity must be a positive integer",
      });
    }

    const reservation = await prisma.$transaction(
  async (tx) => {

    // LOCK inventory row
    const inventoryRows =
      await tx.$queryRaw<any[]>`
        SELECT *
        FROM "Inventory"
        WHERE id = ${inventoryId}
        FOR UPDATE
      `;

    const inventory = inventoryRows[0];

    if (!inventory) {
      throw new Error("INVENTORY_NOT_FOUND");
    }

    const availableStock =
      inventory.totalStock -
      inventory.reservedStock;

    if (availableStock < quantity) {
      throw new Error("INSUFFICIENT_STOCK");
    }

    // Safe update
    await tx.inventory.update({
      where: {
        id: inventory.id,
      },

      data: {
        reservedStock: {
          increment: quantity,
        },
      },
    });

    // Create reservation
    const reservation =
      await tx.reservation.create({
        data: {
          inventoryId: inventory.id,

          quantity,

          status: "PENDING",

          expiresAt: new Date(
            Date.now() + 10 * 60 * 1000
          ),
        },
      });

    return reservation;
  }
);

    return res.status(201).json({
      message: "Stock reserved successfully",
      reservation,
    })

    

  }catch (err: any) {

    console.log(err);

    if (
      err.message === "INVENTORY_NOT_FOUND"
    ) {
      return res.status(404).json({
        message: "Inventory not found",
      });
    }

    if (
      err.message === "INSUFFICIENT_STOCK"
    ) {
      return res.status(409).json({
        message: "Not enough stock available",
      });
    }

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};



export const confirmReservation = async (
  req: Request,
  res: Response
) => {
  try {

    const { id } = req.params;

    const confirmedReservation =
      await prisma.$transaction(async (tx) => {
        const reservationRows =
          await tx.$queryRaw<any[]>`
            SELECT *
            FROM "Reservation"
            WHERE id = ${id}
            FOR UPDATE
          `;

        const reservation =
          reservationRows[0];

        
        if (!reservation) {
          throw new Error(
            "RESERVATION_NOT_FOUND"
          );
        }

        if (
          reservation.status !== "PENDING"
        ) {
          throw new Error(
            "INVALID_RESERVATION_STATUS"
          );
        }
        if (
          new Date(reservation.expiresAt) <
          new Date()
        ) {
          throw new Error(
            "RESERVATION_EXPIRED"
          );
        }

        // LOCK inventory row
        const inventoryRows =
          await tx.$queryRaw<any[]>`
            SELECT *
            FROM "Inventory"
            WHERE id = ${reservation.inventoryId}
            FOR UPDATE
          `;

        const inventory =
          inventoryRows[0];

        if (!inventory) {
          throw new Error(
            "INVENTORY_NOT_FOUND"
          );
        }

        await tx.inventory.update({
          where: {
            id: inventory.id,
          },

          data: {

            totalStock: {
              decrement:
                reservation.quantity,
            },

            reservedStock: {
              decrement:
                reservation.quantity,
            },
          },
        });

        
        const updatedReservation =
          await tx.reservation.update({
            where: {
              id: reservation.id,
            },

            data: {
              status: "CONFIRMED",
            },
          });

        return updatedReservation;
      });

    return res.status(200).json({
      message:
        "Reservation confirmed successfully",

      reservation:
        confirmedReservation,
    });

  } catch (err: any) {

    console.log(err);

    if (
      err.message ===
      "RESERVATION_NOT_FOUND"
    ) {
      return res.status(404).json({
        message: "Reservation not found",
      });
    }

    if (
      err.message ===
      "INVALID_RESERVATION_STATUS"
    ) {
      return res.status(400).json({
        message:
          "Reservation already processed",
      });
    }

    if (
      err.message ===
      "RESERVATION_EXPIRED"
    ) {
      return res.status(410).json({
        message: "Reservation expired",
      });
    }

    if (
      err.message ===
      "INVENTORY_NOT_FOUND"
    ) {
      return res.status(404).json({
        message: "Inventory not found",
      });
    }

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};



export const releaseReservation = async (
  req: Request,
  res: Response
) => {
  try {

    const { id } = req.params;

    const releasedReservation =
      await prisma.$transaction(async (tx) => {

        // LOCK reservation row
        const reservationRows =
          await tx.$queryRaw<any[]>`
            SELECT *
            FROM "Reservation"
            WHERE id = ${id}
            FOR UPDATE
          `;

        const reservation =
          reservationRows[0];

        // Reservation not found
        if (!reservation) {
          throw new Error(
            "RESERVATION_NOT_FOUND"
          );
        }

        // Only pending reservations
        if (
          reservation.status !== "PENDING"
        ) {
          throw new Error(
            "INVALID_RESERVATION_STATUS"
          );
        }

        // LOCK inventory row
        const inventoryRows =
          await tx.$queryRaw<any[]>`
            SELECT *
            FROM "Inventory"
            WHERE id = ${reservation.inventoryId}
            FOR UPDATE
          `;

        const inventory =
          inventoryRows[0];

        if (!inventory) {
          throw new Error(
            "INVENTORY_NOT_FOUND"
          );
        }

        // Return stock back
        await tx.inventory.update({
          where: {
            id: inventory.id,
          },

          data: {
            reservedStock: {
              decrement:
                reservation.quantity,
            },
          },
        });

        // Mark reservation released
        const updatedReservation =
          await tx.reservation.update({
            where: {
              id: reservation.id,
            },

            data: {
              status: "RELEASED",
            },
          });

        return updatedReservation;
      });

    return res.status(200).json({
      message:
        "Reservation released successfully",

      reservation:
        releasedReservation,
    });

  } catch (err: any) {

    console.log(err);

    if (
      err.message ===
      "RESERVATION_NOT_FOUND"
    ) {
      return res.status(404).json({
        message: "Reservation not found",
      });
    }

    if (
      err.message ===
      "INVALID_RESERVATION_STATUS"
    ) {
      return res.status(400).json({
        message:
          "Reservation already processed",
      });
    }

    if (
      err.message ===
      "INVENTORY_NOT_FOUND"
    ) {
      return res.status(404).json({
        message: "Inventory not found",
      });
    }

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};