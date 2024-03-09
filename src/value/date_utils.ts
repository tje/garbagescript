export function addMonthsToDate (date: Date, numMonths: number): Date {
  const copy = new Date(date.getTime())
  copy.setDate(1)
  copy.setMonth(date.getMonth() + numMonths)
  copy.setDate(Math.min(date.getDate(), getDaysInMonth(copy)))
  return copy
}

export function isLeapYear (year: number): boolean {
  return year % 400 === 0
    || (year % 4 === 0 && year % 100 !== 0)
}

export function getDaysInMonth (input: Date): number {
  switch (input.getMonth()) {
    case 0:
    case 2:
    case 4:
    case 6:
    case 7:
    case 9:
    case 11:
      return 31
    case 3:
    case 5:
    case 8:
    case 10:
      return 30
    case 1:
      return isLeapYear(input.getFullYear())
        ? 29
        : 28
  }
  return 0
}
