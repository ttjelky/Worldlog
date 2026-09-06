import { Component } from 'react'
import styles from './ErrorBoundary.module.css'

/**
 * Ловить краші рендеру всього дерева і показує запасний екран
 * замість білої сторінки.
 */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Unhandled render error:', error, info)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <span className={styles.logo}>WL</span>
          <h1 className={styles.title}>Щось пішло не так</h1>
          <p className={styles.text}>
            Сторінка не змогла відобразитись. Спробуй оновити або повернутися на головну.
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => window.location.reload()}
            >
              Оновити сторінку
            </button>
            <button
              type="button"
              className={styles.ghostBtn}
              onClick={() => {
                this.setState({ error: null })
                window.location.href = '/'
              }}
            >
              На головну
            </button>
          </div>
        </div>
      </div>
    )
  }
}
