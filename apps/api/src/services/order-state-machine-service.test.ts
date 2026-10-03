import { describe, expect, it } from "vitest";
import {
  isMasterOrderTransitionAllowed,
  isSubOrderTransitionAllowed,
} from "./order-state-machine-service";

describe("order state machine", () => {
  it("allows the normal master-order lifecycle", () => {
    expect(isMasterOrderTransitionAllowed("pending", "confirmed")).toBe(true);
    expect(isMasterOrderTransitionAllowed("confirmed", "preparing")).toBe(true);
    expect(isMasterOrderTransitionAllowed("preparing", "ready_for_pickup")).toBe(true);
    expect(isMasterOrderTransitionAllowed("ready_for_pickup", "assigned")).toBe(true);
    expect(isMasterOrderTransitionAllowed("assigned", "picked_up")).toBe(true);
    expect(isMasterOrderTransitionAllowed("picked_up", "out_for_delivery")).toBe(true);
    expect(isMasterOrderTransitionAllowed("out_for_delivery", "delivered")).toBe(true);
  });

  it("rejects illegal master-order jumps and terminal reversals", () => {
    expect(isMasterOrderTransitionAllowed("pending", "delivered")).toBe(false);
    expect(isMasterOrderTransitionAllowed("delivered", "preparing")).toBe(false);
    expect(isMasterOrderTransitionAllowed("refunded", "pending")).toBe(false);
  });

  it("allows cancellation and rejects sub-order terminal reversals", () => {
    expect(isSubOrderTransitionAllowed("pending", "cancelled")).toBe(true);
    expect(isSubOrderTransitionAllowed("out_for_delivery", "cancelled")).toBe(true);
    expect(isSubOrderTransitionAllowed("delivered", "cancelled")).toBe(false);
    expect(isSubOrderTransitionAllowed("cancelled", "confirmed")).toBe(false);
  });
});
