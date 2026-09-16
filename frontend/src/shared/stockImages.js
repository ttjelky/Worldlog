// WorldLog — безкоштовні стокові картинки (Unsplash License = free commercial use)
export const STOCK_AVATARS = [
  "https://images.unsplash.com/photo-1474511320723-9a56873867b5?q=80&w=256&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1546182990-dffeafbe841d?q=80&w=256&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?q=80&w=256&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=256&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1484406566174-9da000fda645?q=80&w=256&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1497752531616-c3afd9760a11?q=80&w=256&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1425082661705-1834bfd09dca?q=80&w=256&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?q=80&w=256&auto=format&fit=crop",
];
export const STOCK_WORLD_COVERS = [
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1433086966358-54859d0ed716?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1485465053475-dd55ed3894b9?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=1200&auto=format&fit=crop",
];
export const STOCK_LOCATION_IMAGES = {
  farm: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=800&auto=format&fit=crop",
  mine: "https://images.unsplash.com/photo-1504893524553-b855bce32c67?q=80&w=800&auto=format&fit=crop",
  town: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?q=80&w=800&auto=format&fit=crop",
  base: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=800&auto=format&fit=crop",
  structure: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop",
  biome: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=800&auto=format&fit=crop",
  build: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=800&auto=format&fit=crop",
  poi: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=800&auto=format&fit=crop",
  other: "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=800&auto=format&fit=crop",
};
export const STOCK_EVENT_IMAGES = {
  battle: "https://images.unsplash.com/photo-1475738972911-5b44ce984c42?q=80&w=800&auto=format&fit=crop",
  building: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?q=80&w=800&auto=format&fit=crop",
  death: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=800&auto=format&fit=crop",
  boss: "https://images.unsplash.com/photo-1509558567730-6c838437b06b?q=80&w=800&auto=format&fit=crop",
  discovery: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?q=80&w=800&auto=format&fit=crop",
  achievement: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=800&auto=format&fit=crop",
  other: "https://images.unsplash.com/photo-1439066615861-d1af74d74000?q=80&w=800&auto=format&fit=crop",
};
// Детермінований вибір стоку за id/рядком (щоб картки не миготіли)
export function stockFor(id, arr) { if (!arr?.length) return null; let h = 0; const s = String(id ?? ""); for (let i=0;i<s.length;i++) h = (h*31 + s.charCodeAt(i)) >>> 0; return arr[h % arr.length]; }
export function stockAvatarFor(id) { return stockFor(id, STOCK_AVATARS); }
export function stockCoverFor(id) { return stockFor(id, STOCK_WORLD_COVERS); }
