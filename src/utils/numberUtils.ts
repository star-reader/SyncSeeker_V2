export const formatNumberToString = (num: number) => {
    return num.toString().length < 4 ? '0' + num.toString() : num.toString()
}