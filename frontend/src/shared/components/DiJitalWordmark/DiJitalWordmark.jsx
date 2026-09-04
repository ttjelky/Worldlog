import styles from './DiJitalWordmark.module.css'

export default function DiJitalWordmark({
  size = 16,
  color = 'currentColor',
  jColor = '#7C83F5',
  className = '',
}) {
  const svgHeight = size
  const svgWidth = size * 5.2

  return (
    <svg
      width={svgWidth}
      height={svgHeight}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${styles.wordmark} ${className}`}
      aria-label="DiJital"
    >
      <text
        x="0"
        y={svgHeight * 0.78}
        fill={color}
        fontFamily='"Inter", system-ui, -apple-system, sans-serif'
        fontWeight="700"
        fontSize={svgHeight * 0.82}
      >
        Di
      </text>
      <text
        x={svgWidth * 0.195}
        y={svgHeight * 0.78}
        fill={jColor}
        fontFamily='"Inter", system-ui, -apple-system, sans-serif'
        fontWeight="700"
        fontSize={svgHeight * 0.82}
      >
        J
      </text>
      <text
        x={svgWidth * 0.3}
        y={svgHeight * 0.78}
        fill={color}
        fontFamily='"Inter", system-ui, -apple-system, sans-serif'
        fontWeight="700"
        fontSize={svgHeight * 0.82}
      >
        ital
      </text>
    </svg>
  )
}
