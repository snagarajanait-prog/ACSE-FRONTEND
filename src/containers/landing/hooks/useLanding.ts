/**
 * Owns the Landing screen's only real behaviour: handing off to the copilot.
 *
 * Every "Ask ACSE AI" affordance on the page — navbar, hero, use-case cards, the
 * closing CTA and the floating launcher — goes through this one handler, so they
 * all behave identically: navigate to the full-page copilot.
 *
 * A hand-off can carry a use case with it. The scenario id is parked in the demo
 * slice before navigating, and the engine picks it up and auto-plays it as soon
 * as a customer context exists.
 */

import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '@/constants/constants'
import { playScenario } from '@/redux/demoSlice'
import { useAppDispatch } from '@/redux/hooks'

export function useLanding() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const askAcseAi = useCallback(
    (scenarioId?: string) => {
      if (scenarioId) dispatch(playScenario(scenarioId))
      navigate(ROUTE_PATHS.copilot)
    },
    [dispatch, navigate],
  )

  return { askAcseAi }
}
