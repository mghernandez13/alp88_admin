import * as XLSX from "xlsx";

type WinnerExcelRow = {
  Admin: string;
  "Bettor Name": string;
  Bet: string;
  Remarks: string;
  Prize: number;
};

type WinnerExcelOptions = {
  rows: WinnerExcelRow[];
  fileName: string;
  selectedDate: string;
  drawName: string;
  winningCombination: string;
  sheetName?: string;
};

const thinGrayBorder = {
  top: { style: "thin", color: { rgb: "9CA3AF" } },
  bottom: { style: "thin", color: { rgb: "9CA3AF" } },
  left: { style: "thin", color: { rgb: "9CA3AF" } },
  right: { style: "thin", color: { rgb: "9CA3AF" } },
};

const formatWinnerDate = (date: string) => {
  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "2-digit",
    year: "numeric",
  }).format(parsed);
};

export const generateExcelFile = (
  data: Record<string, number | string>[],
  fileName: string,
  sheetName = "Jackpot Winners",
) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};

export const generateWinnerExcelFile = async ({
  rows,
  fileName,
  selectedDate,
  drawName,
  winningCombination,
  sheetName = "Winners",
}: WinnerExcelOptions) => {
  const StyledXLSX = await import("xlsx-js-style");
  const totalPrize = rows.reduce((total, row) => total + row.Prize, 0);
  const worksheet = StyledXLSX.utils.aoa_to_sheet([
    [formatWinnerDate(selectedDate), null, null, null, null],
    [`${drawName} Draw`, null, null, `${rows.length} Winners`, null],
    [winningCombination || "-", null, null, "Total Prize", null],
    [null, null, null, { t: "n", v: totalPrize, z: '"PHP "#,##0.00' }, null],
    ["Admin", "Bettor Name", "Bet", "Remarks", "Prize"],
    ...rows.map((row) => [
      row.Admin,
      row["Bettor Name"],
      row.Bet,
      row.Remarks,
      { t: "n", v: row.Prize, z: '"PHP "#,##0.00' },
    ]),
  ]);

  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
    { s: { r: 1, c: 3 }, e: { r: 1, c: 4 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } },
    { s: { r: 2, c: 3 }, e: { r: 2, c: 4 } },
    { s: { r: 3, c: 3 }, e: { r: 3, c: 4 } },
  ];

  worksheet["!cols"] = [
    { wch: 26 },
    { wch: 34 },
    { wch: 22 },
    { wch: 38 },
    { wch: 20 },
  ];
  worksheet["!rows"] = [
    { hpt: 26 },
    { hpt: 42 },
    { hpt: 34 },
    { hpt: 25 },
    { hpt: 30 },
    ...rows.map(() => ({ hpt: 26 })),
  ];

  const styleCell = (address: string, style: Record<string, unknown>) => {
    const cell = worksheet[address];
    if (cell) {
      cell.s = style;
    }
  };

  styleCell("A1", {
    font: { name: "Arial", sz: 12, color: { rgb: "111111" } },
    alignment: { vertical: "center" },
    fill: { patternType: "solid", fgColor: { rgb: "FFFFFF" } },
  });
  styleCell("A2", {
    font: { name: "Arial", sz: 25, bold: true, color: { rgb: "111111" } },
    alignment: { vertical: "center" },
    fill: { patternType: "solid", fgColor: { rgb: "FFFFFF" } },
  });
  styleCell("D2", {
    font: { name: "Arial", sz: 14, bold: true, color: { rgb: "111111" } },
    alignment: { horizontal: "right", vertical: "center" },
    fill: { patternType: "solid", fgColor: { rgb: "FFFFFF" } },
  });
  styleCell("A3", {
    font: { name: "Arial", sz: 20, bold: true, color: { rgb: "111111" } },
    alignment: { vertical: "center" },
    fill: { patternType: "solid", fgColor: { rgb: "FFFFFF" } },
  });
  styleCell("D3", {
    font: { name: "Arial", sz: 10, italic: true, color: { rgb: "555555" } },
    alignment: { horizontal: "right", vertical: "center" },
    fill: { patternType: "solid", fgColor: { rgb: "FFFFFF" } },
  });
  styleCell("D4", {
    font: { name: "Arial", sz: 16, bold: true, color: { rgb: "111111" } },
    alignment: { horizontal: "right", vertical: "center" },
    fill: { patternType: "solid", fgColor: { rgb: "FFFFFF" } },
  });

  for (let column = 0; column < 5; column += 1) {
    const address = StyledXLSX.utils.encode_cell({ r: 4, c: column });
    styleCell(address, {
      font: { name: "Arial", sz: 12, bold: true, color: { rgb: "000000" } },
      fill: { patternType: "solid", fgColor: { rgb: "FACC15" } },
      alignment: { vertical: "center" },
      border: thinGrayBorder,
    });
  }

  rows.forEach((_, rowIndex) => {
    for (let column = 0; column < 5; column += 1) {
      const address = StyledXLSX.utils.encode_cell({ r: rowIndex + 5, c: column });
      const isPrize = column === 4;
      styleCell(address, {
        font: { name: "Arial", sz: 11, color: { rgb: "111111" } },
        fill: {
          patternType: "solid",
          fgColor: { rgb: rowIndex % 2 === 0 ? "FFFFFF" : "DEDEDE" },
        },
        alignment: {
          vertical: "center",
          horizontal: isPrize ? "right" : "left",
          wrapText: true,
        },
        border: thinGrayBorder,
        ...(isPrize ? { numFmt: '"PHP "#,##0.00' } : {}),
      });
    }
  });

  const workbook = StyledXLSX.utils.book_new();
  StyledXLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  StyledXLSX.writeFile(workbook, `${fileName}.xlsx`);
};
