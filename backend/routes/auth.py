import logging
from urllib.parse import quote, urlencode

import httpx
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel

from config import settings
from services.auth import create_access_token, validate_email_domain, verify_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


class VerifyTokenRequest(BaseModel):
    token: str


@router.get("/google")
async def google_auth() -> RedirectResponse:
    if not settings.google_client_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth not configured",
        )

    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "online",
    }
    return RedirectResponse(url=f"{GOOGLE_AUTH_URL}?{urlencode(params)}")


@router.get("/google/callback")
async def google_callback(code: str | None = None) -> RedirectResponse:
    if not code:
        raise HTTPException(status_code=400, detail="Authorization code not provided")

    try:
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "code": code,
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "redirect_uri": settings.google_redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            token_response.raise_for_status()
            access_token = token_response.json().get("access_token")
            if not access_token:
                raise HTTPException(status_code=400, detail="Failed to obtain access token")

            userinfo_response = await client.get(
                GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            userinfo_response.raise_for_status()
            user_info = userinfo_response.json()

            email = user_info.get("email", "")
            if not email:
                raise HTTPException(status_code=400, detail="Email not provided by Google")

            if not validate_email_domain(email):
                logger.warning("OAuth access denied for email: %s", email)
                error_message = f"Email domain must be {settings.allowed_email_domain}"
                return RedirectResponse(
                    url=f"{settings.frontend_url}/auth/callback?error={quote(error_message)}"
                )

            jwt_token = create_access_token(
                email=email,
                name=user_info.get("name", ""),
                picture=user_info.get("picture", ""),
            )
            return RedirectResponse(
                url=f"{settings.frontend_url}/auth/callback?token={jwt_token}"
            )
    except httpx.HTTPStatusError as exc:
        logger.error("OAuth HTTP error: %s", exc.response.text)
        raise HTTPException(status_code=400, detail="OAuth authentication failed") from exc
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("OAuth error: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Authentication failed") from exc


@router.post("/verify")
async def verify_token_endpoint(request: VerifyTokenRequest) -> JSONResponse:
    token_data = verify_token(request.token)
    if token_data is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if not validate_email_domain(token_data.email):
        raise HTTPException(status_code=403, detail="Invalid email domain")

    return JSONResponse(
        {
            "valid": True,
            "email": token_data.email,
            "name": token_data.name,
            "picture": token_data.picture,
        }
    )


@router.post("/logout")
async def logout() -> JSONResponse:
    return JSONResponse({"message": "Logged out successfully"})
