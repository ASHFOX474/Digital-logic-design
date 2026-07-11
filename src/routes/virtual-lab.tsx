import { createFileRoute } from "@tanstack/react-router";
import { VirtualLab } from "@/components/lab/VirtualLab";

export const Route = createFileRoute("/virtual-lab")({
  component: VirtualLab,
  head: () => ({
    meta: [
      { title: "Virtual Lab · DIGITAL LOGIC DESIGN" },
      {
        name: "description",
        content: "A fully interactive digital trainer kit — drag gates and ICs onto a virtual breadboard and wire them up.",
      },
    ],
  }),
});
