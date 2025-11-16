import ExcelJS from "exceljs";

/**
 * Parses CSV data into a 2D array
 */
function parseCsvToArray(csvData: string): string[][] {
  const lines = csvData.trim().split("\n");
  return lines.map((line) => {
    // Simple CSV parsing - handles basic cases
    // For more complex CSV with quotes/escapes, we'd need a proper CSV parser
    return line.split(",").map((cell) => cell.trim());
  });
}

/**
 * Converts CSV data to XLSX (Excel) format and writes it to a file.
 *
 * @param csvData - The CSV data as a string
 * @param outputPath - The file path where the XLSX file should be written (should end with .xlsx)
 *
 * @example
 * const csvData = "ID,Name,Status\n1,Server1,Running\n2,Server2,Stopped";
 * await csvToXlsx(csvData, "output/inventory.xlsx");
 */
export async function csvToXlsx(
  csvData: string,
  outputPath: string,
): Promise<void> {
  // Parse CSV data into array
  const data = parseCsvToArray(csvData);

  if (data.length === 0) {
    throw new Error("Failed to parse CSV data");
  }

  // Create a new workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Inventory");

  // Add all rows
  worksheet.addRows(data);

  // Auto-size columns based on content
  worksheet.columns.forEach((column, index) => {
    if (column && data.length > 0) {
      const maxLength = Math.max(
        ...data.map((row) =>
          row && row[index] ? row[index].toString().length : 0,
        ),
      );
      column.width = Math.min(maxLength + 2, 50); // Cap at 50 characters width
    }
  });

  // Write the workbook to a file
  const xlsxBuffer = await workbook.xlsx.writeBuffer();
  await Bun.write(outputPath, xlsxBuffer);
}

/**
 * Converts a 2D array of data to XLSX (Excel) format and writes it to a file.
 * The first row is treated as headers.
 *
 * @param data - 2D array where first row contains headers and subsequent rows contain data
 * @param outputPath - The file path where the XLSX file should be written (should end with .xlsx)
 * @param sheetName - Optional name for the worksheet (defaults to "Inventory")
 *
 * @example
 * const data = [
 *   ["ID", "Name", "Status"],
 *   ["1", "Server1", "Running"],
 *   ["2", "Server2", "Stopped"]
 * ];
 * await arrayToXlsx(data, "output/inventory.xlsx", "EC2 Instances");
 */
export async function arrayToXlsx(
  data: string[][],
  outputPath: string,
  sheetName: string = "Inventory",
): Promise<void> {
  // Create a new workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // Add all rows
  worksheet.addRows(data);

  // Auto-size columns based on content
  if (data.length > 0 && data[0]) {
    worksheet.columns.forEach((column, colIndex) => {
      if (column) {
        const maxLength = Math.max(
          ...data.map((row) =>
            row && row[colIndex] ? row[colIndex].toString().length : 0,
          ),
        );
        column.width = Math.min(maxLength + 2, 50); // Cap at 50 characters width
      }
    });
  }

  // Write the workbook to a file
  const xlsxBuffer = await workbook.xlsx.writeBuffer();
  await Bun.write(outputPath, xlsxBuffer);
}

/**
 * Writes data in the specified format(s).
 * Supports CSV, XLSX, or both formats.
 *
 * @param csvData - The data in CSV format as a string
 * @param basePath - The base file path (without extension)
 * @param format - The export format: "csv", "xlsx", or "both"
 * @param sheetName - Optional name for the worksheet in XLSX files
 *
 * @example
 * const csvData = "ID,Name\n1,Server1";
 * await writeInventoryFile(csvData, "output/EC2-us-east-1-20251116-myaccount", "both", "EC2");
 * // Creates:
 * //   - output/EC2-us-east-1-20251116-myaccount.csv
 * //   - output/EC2-us-east-1-20251116-myaccount.xlsx
 */
export async function writeInventoryFile(
  csvData: string,
  basePath: string,
  format: string,
  _sheetName?: string,
): Promise<void> {
  const shouldWriteCsv = format === "csv" || format === "both";
  const shouldWriteXlsx = format === "xlsx" || format === "both";

  if (shouldWriteCsv) {
    const csvPath = basePath.endsWith(".csv") ? basePath : `${basePath}.csv`;
    await Bun.write(csvPath, csvData);
  }

  if (shouldWriteXlsx) {
    const xlsxPath = basePath.endsWith(".csv")
      ? basePath.replace(/\.csv$/, ".xlsx")
      : `${basePath}.xlsx`;
    await csvToXlsx(csvData, xlsxPath);
  }
}
