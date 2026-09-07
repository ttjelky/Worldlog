import { describe, expect, it } from 'vitest'
import { goSection } from './navigation'

function makeNavigate() {
  const calls = []
  const navigate = (path) => calls.push(path)
  return { navigate, calls }
}

describe('goSection', () => {
  it.each([
    ['home', '/app'],
    ['overview', '/app?tab=overview'],
    ['worlds', '/app/worlds'],
    ['friends', '/app/friends'],
    ['search', '/app/search'],
  ])('navigates %s to %s', (id, path) => {
    const { navigate, calls } = makeNavigate()
    goSection(id, navigate)
    expect(calls).toEqual([path])
  })

  it('ignores unknown ids', () => {
    const { navigate, calls } = makeNavigate()
    goSection('nope', navigate)
    expect(calls).toEqual([])
  })
})
