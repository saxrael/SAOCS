import type { SVGProps } from "react"

export function CircleNairaSign(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 17V7l8 10V7" />
      <path d="M6 10.5h12" />
      <path d="M6 13.5h12" />
    </svg>
  )
}
