import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/admin/leads/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authenticated/admin/leads/$id"!</div>
}
