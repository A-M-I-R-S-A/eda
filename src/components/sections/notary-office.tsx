import type { SiteSettings } from "@/types";
import { faPhone } from "@/lib/utils/persian";
import { Icon } from "@/components/ui/icon";

/**
 * The notary office (دفتر اسناد رسمی) — a SEPARATE professional entity.
 *
 * This is not part of the arbitration institution. It belongs to a different
 * person, who is **not** the arbitrator, and the two must never read as one
 * organisation. Three things enforce that here:
 *
 *  1. It renders in its own bordered block, visually detached from the
 *     institution's own contact cards, and never inside them.
 *  2. It carries an explicit notice stating that it is a distinct entity.
 *  3. It renders nothing at all unless an administrator has both filled in the
 *     real details and switched it on — no name, number or address is ever
 *     inferred or placeheld with invented content.
 *
 * Because of (3) this component returns `null` in the default configuration.
 */
export function NotaryOffice({ settings }: { settings: SiteSettings }) {
  const notary = settings.notaryOffice;

  if (!notary?.enabled) return null;
  if (!notary.officeName.trim() || !notary.notaryName.trim()) return null;

  return (
    <section className="section-sm border-t border-line bg-paper-2/40">
      <div className="container-x">
        <div className="border border-line bg-white p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-12">
            <div className="lg:w-1/3">
              <p className="eyebrow">نهاد مستقل</p>
              <h2 className="mt-5 text-[1.25rem] font-bold text-navy-900">
                {notary.officeName}
              </h2>
              <p className="mt-3 text-[0.9375rem] text-muted">
                سردفتر: {notary.notaryName}
              </p>
            </div>

            <div className="lg:flex-1">
              {/*
                The separation notice is not optional chrome — it is the reason
                this block can exist on the site at all.
              */}
              <div className="flex items-start gap-3 border-s-2 border-gold-400 bg-paper-2/60 px-5 py-4">
                <Icon
                  name="info"
                  size={17}
                  className="mt-0.5 shrink-0 text-gold-600"
                />
                <p className="text-[0.8125rem] leading-[2] text-ink-2">
                  {notary.officeName} نهادی مستقل و جدا از{" "}
                  {settings.institutionName} است؛ مدیریت، مسئولیت‌ها و خدمات این دفتر
                  ارتباطی با فعالیت داوری مؤسسه ندارد و سردفتر آن، داور مؤسسه نیست.
                </p>
              </div>

              {notary.note.trim() && (
                <p className="mt-5 text-[0.9375rem] leading-[2.1] text-muted">
                  {notary.note}
                </p>
              )}

              <dl className="mt-6 grid gap-5 sm:grid-cols-2">
                {notary.phone.trim() && (
                  <div className="flex items-start gap-3">
                    <Icon
                      name="phone"
                      size={17}
                      className="mt-1 shrink-0 text-gold-600"
                    />
                    <div>
                      <dt className="text-[0.75rem] text-muted">شماره تماس دفتر</dt>
                      <dd className="mt-1">
                        <a
                          href={`tel:${notary.phone}`}
                          dir="ltr"
                          className="text-[0.9375rem] text-navy-800 transition-colors hover:text-navy-950"
                        >
                          {faPhone(notary.phone)}
                        </a>
                      </dd>
                    </div>
                  </div>
                )}

                {notary.address.trim() && (
                  <div className="flex items-start gap-3">
                    <Icon
                      name="map-pin"
                      size={17}
                      className="mt-1 shrink-0 text-gold-600"
                    />
                    <div>
                      <dt className="text-[0.75rem] text-muted">نشانی دفتر</dt>
                      <dd className="mt-1 text-[0.9375rem] leading-[1.95] text-ink-2">
                        {notary.address}
                      </dd>
                    </div>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
