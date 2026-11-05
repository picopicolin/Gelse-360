import { useFrame } from "@react-three/fiber";
import { createContext, useContext } from "react";

// «Vida» del 3D: operarios, máquinas, carretilla y coches en movimiento. Solo en calidad alta,
// porque obliga a dibujar sin parar (en las tablets gastaría batería).
export const LiveContext = createContext(false);

/** Llama a fn(t) en cada fotograma mientras haya vida, y pide el siguiente. */
export function useLive(fn: (t: number) => void) {
  const live = useContext(LiveContext);
  useFrame((state) => {
    if (!live) return;
    fn(state.clock.elapsedTime);
    state.invalidate();
  });
  return live;
}
