import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel

from config import settings

logger = logging.getLogger(__name__)

security = HTTPBearer()
optional_security = HTTPBearer(auto_error=False)


class TokenData(BaseModel):
    email: str
    name: str
    sub: str
    picture: str = ""


def validate_email_domain(email: str) -> bool:
    if not email:
        return False
    return email.lower().endswith(settings.allowed_email_domain.lower())


def create_access_token(email: str, name: str, picture: str = "") -> str:
    expire = datetime.utcnow() + timedelta(hours=settings.jwt_expiration_hours)
    payload = {
        "sub": email,
        "email": email,
        "name": name,
        "picture": picture,
        "exp": expire,
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def verify_token(token: str) -> Optional[TokenData]:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        email = payload.get("email")
        sub = payload.get("sub")
        if email is None or sub is None:
            return None
        return TokenData(
            email=email,
            name=payload.get("name", ""),
            sub=sub,
            picture=payload.get("picture", ""),
        )
    except JWTError as exc:
        logger.debug("Token verification failed: %s", exc)
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> TokenData:
    token_data = verify_token(credentials.credentials)
    if token_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    if not validate_email_domain(token_data.email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: Email domain must be {settings.allowed_email_domain}",
        )
    return token_data
