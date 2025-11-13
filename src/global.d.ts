type WebComponentContainerProps = import('react').DetailedHTMLProps<
  import('react').HTMLAttributes<HTMLElement>,
  HTMLElement
>

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'navbar-container': WebComponentContainerProps
    }
  }
}