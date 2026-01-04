import { validatePhoneNumber } from "@/shared/validation/phone";
import { z } from "zod";

export class BudgetSMSService {
  private baseUrl = "https://api.budgetsms.net/sendsms";

  async sendSMS(phoneNumber: string, message: string): Promise<boolean> {
    try {
      // Validiere und standardisiere die Telefonnummer
      const validation = validatePhoneNumber(phoneNumber);
      if (!validation.isValid) {
        console.error("Invalid phone number:", validation.error);
        return false;
      }

      const params = new URLSearchParams(
        z.record(z.string(), z.string()).parse({
          username: process.env.BUDGETSMS_USERNAME,
          handle: process.env.BUDGETSMS_HANDLE,
          userid: process.env.BUDGETSMS_USER_ID,
          msg: message,
          from: process.env.BUDGETSMS_FROM,
          to: validation.standardizedNumber,
        })
      );

      const submitUrl = `${this.baseUrl}?${params.toString()}`;
      console.log("submitUrl", submitUrl);

      const response = await fetch(submitUrl, {
        method: "GET",
      });

      const responseText = await response.text();

      if (!response.ok) {
        console.error(
          `BudgetSMS API error: ${response.status} ${response.statusText}`,
          responseText
        );
        return false;
      }

      if (responseText.startsWith("ERR")) {
        console.error(`BudgetSMS returned error: ${responseText}`);
        return false;
      }

      console.log(`BudgetSMS success: ${responseText}`);
      return true;
    } catch (error) {
      console.error("Error sending SMS via BudgetSMS:", error);
      return false;
    }
  }
}

export const budgetSMS = new BudgetSMSService();
