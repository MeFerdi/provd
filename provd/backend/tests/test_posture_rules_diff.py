from datetime import timedelta

from app.posture.diff import diff
from app.posture.rules import evaluate
from tests.posture_fixtures import CHECKED_AT, LZ_LABS, NETHERMIND, eoa, raw, route, safe


def rule_ids(posture):
	return [f.rule_id for f in posture.findings]


def test_two_independent_verifiers_and_safe_admin_is_grade_a():
	posture = evaluate(raw([route(30110, LZ_LABS, NETHERMIND), route(30184, LZ_LABS, NETHERMIND)]))
	assert posture.findings == []
	assert (posture.grade, posture.score, posture.risk_level) == ("A", 100, "low")


def test_single_verifier_routes_are_critical_and_cap_the_grade():
	posture = evaluate(raw([route(30320, LZ_LABS, name="unichain"), route(30110, LZ_LABS, NETHERMIND)]))
	finding = posture.findings[0]
	assert finding.rule_id == "LZ-SINGLE-VERIFIER" and finding.severity == "critical"
	assert finding.pathways == [30320]
	assert finding.title.startswith("1 of 2 routes")
	assert posture.single_verifier_pathways == 1
	assert posture.score == 65 and posture.grade == "D"  # C by score, capped at D by the critical
	assert posture.risk_level == "critical"


def test_optional_threshold_of_one_counts_as_single_verifier():
	posture = evaluate(raw([route(30110, optional=(LZ_LABS, NETHERMIND), threshold=1)]))
	assert "LZ-SINGLE-VERIFIER" in rule_ids(posture)


def test_kelp_like_posture_at_exploit_is_grade_f():
	routes = [route(30217, LZ_LABS, NETHERMIND)] + [route(30300 + i, LZ_LABS) for i in range(24)]
	posture = evaluate(raw(routes, owner=safe(3, 6), delegate=eoa()))
	assert rule_ids(posture)[:2] == ["LZ-SINGLE-VERIFIER", "ADM-EOA-DELEGATE"]
	assert posture.grade == "F" and posture.score == 30
	assert posture.findings[0].title.startswith("24 of 25 routes")


def test_admin_rules():
	posture = evaluate(raw([route(30110, LZ_LABS, NETHERMIND)], owner=eoa(), delegate=safe(1, 3)))
	ids = rule_ids(posture)
	assert "ADM-EOA-OWNER" in ids
	low = next(f for f in posture.findings if f.rule_id == "ADM-LOW-THRESHOLD")
	assert low.severity == "high" and "1 signature" in low.title


def test_same_safe_as_owner_and_delegate_is_reported_once():
	admin = safe(2, 5)
	posture = evaluate(raw([route(30110, LZ_LABS, NETHERMIND)], owner=admin, delegate=admin))
	assert rule_ids(posture).count("ADM-LOW-THRESHOLD") == 1


def test_single_operator_default_config_and_low_confirmations():
	second_lz = LZ_LABS.model_copy(update={"address": "0x" + "dd" * 20})
	posture = evaluate(
		raw(
			[route(30110, LZ_LABS, second_lz), route(30184, LZ_LABS, NETHERMIND, default=True, confirmations=5)],
			defaults={30184: 10},
		)
	)
	assert {"LZ-SINGLE-OPERATOR", "LZ-DEFAULT-CONFIG", "LZ-LOW-CONFIRMATIONS"} <= set(rule_ids(posture))


def test_diff_detects_reduction_new_weak_route_and_admin_change():
	before = evaluate(raw([route(30110, LZ_LABS, NETHERMIND), route(30184, LZ_LABS, NETHERMIND)]))
	after = evaluate(
		raw(
			[route(30110, LZ_LABS), route(30184, LZ_LABS, NETHERMIND), route(30320, LZ_LABS, name="unichain")],
			delegate=eoa(),
		)
	)
	events = {e.kind: e for e in diff(before, after, now=CHECKED_AT + timedelta(hours=1))}
	assert events["CHG-VERIFIER-REDUCED"].severity == "critical"
	assert "2 → 1" in events["CHG-VERIFIER-REDUCED"].summary
	assert events["CHG-NEW-ROUTE"].severity == "critical" and events["CHG-NEW-ROUTE"].pathway == 30320
	assert events["CHG-ADMIN-CHANGED"].summary == "Delegate changed"


def test_diff_of_identical_postures_is_empty_and_route_removal_is_info():
	posture = evaluate(raw([route(30110, LZ_LABS, NETHERMIND), route(30184, LZ_LABS, NETHERMIND)]))
	assert diff(posture, posture) == []
	fewer = evaluate(raw([route(30110, LZ_LABS, NETHERMIND)]))
	(event,) = diff(posture, fewer)
	assert (event.kind, event.severity, event.pathway) == ("CHG-ROUTE-REMOVED", "info", 30184)
