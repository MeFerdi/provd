from app.models.api_key import ApiKey
from app.models.client import Client
# Legacy tables from the earlier product, kept registered so migrations stay in sync; unused by the API.
from app.models.dispute import Dispute
from app.models.score_log import ScoreLog
from app.models.rails import Account, Checkpoint, CreditPurchase, Decision, FlaggedAddress, HistoryCache, Outcome, UsageEvent
