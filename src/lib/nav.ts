import type { Role } from "./session";

// Secciones de la web y quién las ve. «fabrica» solo ve su pantalla y el stock.
// Las que llevan `fase` aún no están hechas: se muestran con la fase en la que llegan.
export type Section = { href: string; label: string; roles: Role[]; fase?: number };

export const SECTIONS: Section[] = [
  { href: "/", label: "Panel", roles: ["direccion"] },
  { href: "/clientes", label: "Clientes", roles: ["direccion"] },
  { href: "/cocinas", label: "Cocinas", roles: ["direccion"] },
  { href: "/catalogo", label: "Catálogo", roles: ["direccion"] },
  { href: "/fabrica", label: "Fábrica", roles: ["direccion", "fabrica"] },
  { href: "/stock", label: "Stock", roles: ["direccion", "fabrica"] },
  { href: "/naves", label: "Naves 3D", roles: ["direccion"] },
  { href: "/montajes", label: "Montajes", roles: ["direccion"] },
  { href: "/importar", label: "Importar", roles: ["direccion"] },
  { href: "/registro", label: "Registro", roles: ["direccion"] },
  { href: "/usuarios", label: "Usuarios", roles: ["direccion"] },
];
