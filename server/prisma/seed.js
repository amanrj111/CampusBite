import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const menu = [
  {
    name: "Breakfast",
    icon: "🌅",
    items: [
      { name: "Masala Dosa", description: "Crispy dosa with potato masala, coconut chutney & sambar", price: 60, isVeg: true, popular: true, prepMinutes: 10, image: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800&q=80" },
      { name: "Idli Sambar", description: "Soft steamed idlis with hot sambar and chutney", price: 40, isVeg: true, popular: true, prepMinutes: 6, image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&q=80" },
      { name: "Poha", description: "Flattened rice with peanuts, onion and lemon", price: 35, isVeg: true, popular: false, prepMinutes: 5, image: "https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=800&q=80" },
      { name: "Aloo Paratha", description: "Stuffed paratha with butter and curd", price: 50, isVeg: true, popular: false, prepMinutes: 12, image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&q=80" }
    ]
  },
  {
    name: "Mains",
    icon: "🍛",
    items: [
      { name: "Veg Thali", description: "Dal, sabzi, roti, rice, salad and sweet", price: 120, isVeg: true, popular: true, prepMinutes: 12, image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&q=80" },
      { name: "Chicken Biryani", description: "Fragrant basmati, tender chicken, raita", price: 160, isVeg: false, popular: true, prepMinutes: 15, image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&q=80" },
      { name: "Paneer Butter Masala", description: "Creamy tomato gravy with fresh paneer & 2 rotis", price: 130, isVeg: true, popular: true, prepMinutes: 12, image: "https://images.unsplash.com/photo-1631452180519-c014fe946bcc?w=800&q=80" },
      { name: "Egg Fried Rice", description: "Wok-tossed rice with eggs and veggies", price: 90, isVeg: false, popular: false, prepMinutes: 10, image: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&q=80" }
    ]
  },
  {
    name: "Snacks",
    icon: "🍟",
    items: [
      { name: "Samosa (2 pcs)", description: "Golden fried pastry with spiced potato filling", price: 25, isVeg: true, popular: true, prepMinutes: 4, image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&q=80" },
      { name: "Veg Burger", description: "Crispy patty, lettuce, house sauce", price: 70, isVeg: true, popular: false, prepMinutes: 8, image: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80" },
      { name: "French Fries", description: "Salted fries with ketchup", price: 50, isVeg: true, popular: false, prepMinutes: 6, image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&q=80" },
      { name: "Chicken Roll", description: "Spiced chicken wrapped in paratha", price: 90, isVeg: false, popular: true, prepMinutes: 9, image: "https://images.unsplash.com/photo-1601050690117-94f5f6a7a2c5?w=800&q=80" }
    ]
  },
  {
    name: "Beverages",
    icon: "☕",
    items: [
      { name: "Masala Chai", description: "Strong campus chai with ginger and cardamom", price: 15, isVeg: true, popular: true, prepMinutes: 3, image: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=800&q=80" },
      { name: "Cold Coffee", description: "Iced coffee blended with ice cream", price: 45, isVeg: true, popular: false, prepMinutes: 4, image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800&q=80" },
      { name: "Fresh Lime Soda", description: "Sweet, salted or mixed", price: 30, isVeg: true, popular: false, prepMinutes: 3, image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&q=80" },
      { name: "Mango Lassi", description: "Thick yogurt mango smoothie", price: 40, isVeg: true, popular: true, prepMinutes: 4, image: "https://images.unsplash.com/photo-1525385133512-2f3bdd039054?w=800&q=80" }
    ]
  }
];

async function main() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.counter.deleteMany();

  const hash = (p) => bcrypt.hashSync(p, 10);

  await prisma.user.createMany({
    data: [
      { name: "Campus Admin", email: "admin@canteen.com", password: hash("admin123"), role: "ADMIN", walletBalance: 0 },
      { name: "Kitchen Staff", email: "kitchen@canteen.com", password: hash("kitchen123"), role: "KITCHEN", walletBalance: 0 },
      { name: "Aarav Sharma", email: "user@canteen.com", password: hash("user123"), role: "USER", walletBalance: 500 }
    ]
  });

  for (const cat of menu) {
    await prisma.category.create({
      data: {
        name: cat.name,
        icon: cat.icon,
        items: { create: cat.items }
      }
    });
  }

  await prisma.counter.create({ data: { id: "token", value: 100 } });
  console.log("Seeded demo users, menu and token counter.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
