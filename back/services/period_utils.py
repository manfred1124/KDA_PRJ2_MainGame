def period_to_date(period: str) -> str:
    year, half = period.split()
    if half == "H1":
        return f"{year}-01-01"
    else:
        return f"{year}-07-01" 