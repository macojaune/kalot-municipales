import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/$region')({
  component: RegionRouteShell,
})

function RegionRouteShell() {
  return <Outlet />
}
