import test from 'node:test'
import assert from 'node:assert/strict'

import { defaultTokenExtractor } from '../../rbac-node/dist/rbac-node.node.mjs'

test('legacy token extractor prefers access_token cookie', () => {
  const token = defaultTokenExtractor({
    cookies: { access_token: 'cookie-token' },
    headers: { authorization: 'Bearer bearer-token' },
  })

  assert.equal(token, 'cookie-token')
})

test('legacy token extractor falls back to Bearer', () => {
  const token = defaultTokenExtractor({
    cookies: {},
    headers: { authorization: 'Bearer bearer-token' },
  })

  assert.equal(token, 'bearer-token')
})

test('legacy token extractor rejects unsupported authorization schemes', () => {
  const token = defaultTokenExtractor({
    cookies: {},
    headers: { authorization: 'Basic credentials' },
  })

  assert.equal(token, undefined)
})
