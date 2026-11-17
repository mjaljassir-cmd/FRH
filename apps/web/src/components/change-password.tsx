import { getTranslations } from "next-intl/server";
import { ActionForm } from "./action-form";
import { SubmitButton } from "./client";
import { Field } from "./ui";
import { changePasswordAction } from "@/app/[locale]/auth-actions";

export async function ChangePasswordCard() {
  const t = await getTranslations("auth");
  return (
    <div className="card">
      <h2 className="mb-4 font-bold">{t("changePassword")}</h2>
      <ActionForm action={changePasswordAction} successMessage={t("passwordChanged")} resetOnSuccess>
        <Field label={t("currentPassword")}>
          <input name="current" type="password" required className="input" dir="ltr" />
        </Field>
        <Field label={t("newPassword")} hint={t("passwordHint")}>
          <input name="password" type="password" required minLength={8} className="input" dir="ltr" />
        </Field>
        <Field label={t("confirmPassword")}>
          <input name="confirm" type="password" required minLength={8} className="input" dir="ltr" />
        </Field>
        <SubmitButton>{t("changePassword")}</SubmitButton>
      </ActionForm>
    </div>
  );
}
