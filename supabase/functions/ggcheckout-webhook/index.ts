import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    console.log("Recebido webhook payload:", JSON.stringify(payload, null, 2))

    // 1. Initialize Supabase Service Role Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    // 2. Insert payload into ggcheckout_webhooks (Trigger will automatically handle members table)
    const { data: dbData, error: dbError } = await supabaseClient
      .from('ggcheckout_webhooks')
      .insert([{ payload }])
      .select()

    if (dbError) {
      console.error("Erro ao salvar webhook no banco:", dbError)
      return new Response(JSON.stringify({ error: "Erro ao salvar dados no banco." }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 3. Check if purchase is approved/paid to update member and send the email
    const email = payload.customer?.email?.trim().toLowerCase()
    const name = payload.customer?.name ?? 'Cliente'
    const event = payload.event
    const paymentStatus = payload.payment?.status

    if (email && (paymentStatus === 'paid' || event === 'pix.paid')) {

      // Gather all purchased titles in this payload
      const products = payload.products ?? []
      const purchasedTitles: string[] = []
      products.forEach((p: any) => {
        if (p.title && !purchasedTitles.includes(p.title)) {
          purchasedTitles.push(p.title)
        }
      })
      if (payload.product?.title && !purchasedTitles.includes(payload.product.title)) {
        purchasedTitles.push(payload.product.title)
      }

      // Fetch the existing member to merge orderbumps and plan
      const { data: member, error: memberError } = await supabaseClient
        .from('members')
        .select('*')
        .eq('email', email)
        .maybeSingle()

      let updatedOrderbumps = member ? (member.orderbumps || []) : []
      let updatedPlan = member ? (member.plan || 'Básico') : 'Básico'
      let needsUpdate = false

      purchasedTitles.forEach((title: string) => {
        const isCoreMain = title.toLowerCase().includes('300 técnicas') || title.toLowerCase().includes('doenças bovinas')
        
        if (isCoreMain) {
          if (title.toLowerCase().includes('completo') || title.toLowerCase().includes('full')) {
            if (updatedPlan !== 'Completo') {
              updatedPlan = 'Completo'
              needsUpdate = true
            }
          }
        } else {
          // If it is not the main Bovino product, add to orderbumps list
          if (!updatedOrderbumps.includes(title)) {
            updatedOrderbumps.push(title)
            needsUpdate = true
          }
        }
      })

      if (member) {
        if (needsUpdate) {
          await supabaseClient
            .from('members')
            .update({ orderbumps: updatedOrderbumps, plan: updatedPlan })
            .eq('email', email)
        }
      } else {
        await supabaseClient
          .from('members')
          .insert([{
            email,
            name,
            plan: updatedPlan,
            orderbumps: updatedOrderbumps
          }])
      }

      // Determine the plan description to show in email
      const planToShow = updatedPlan

      // Identify additional items purchased in this specific transaction for email display
      const additionalItems: string[] = []
      purchasedTitles.forEach((title: string) => {
        const isCoreMain = title.toLowerCase().includes('300 técnicas') || title.toLowerCase().includes('doenças bovinas')
        if (!isCoreMain) {
          additionalItems.push(title)
        }
      })

      // 4. Send Email Setup
      const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? ""
      const brevoApiKey = Deno.env.get("BREVO_API_KEY") ?? ""
      
      // Build orderbumps HTML cards if any
      let orderbumpHtml = ""
      if (additionalItems.length > 0) {
        additionalItems.forEach((bumpTitle: string) => {
          orderbumpHtml += `
            <div style="margin: 20px 0; padding: 16px; background-color: #f4fbf6; border-left: 4px solid #10b981; border-radius: 0 8px 8px 0; color: #065f46; font-family: sans-serif; text-align: left;">
              <span style="font-size: 14px; font-weight: bold; display: block; margin-bottom: 4px;">🎉 MATERIAL ADICIONAL LIBERADO!</span>
              <span style="font-size: 15px;">O seu bônus adicional <strong>${bumpTitle}</strong> também já está disponível na sua conta!</span>
            </div>
          `
        })
      }

      // Build HTML Email Template
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Seu Acesso Liberado</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f6f9fc; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" max-width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); border: 1px solid #e3e8ee;">
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #1e3f20; padding: 40px 30px; text-align: center; color: #ffffff;">
                      <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Acesso Liberado!</h1>
                    </td>
                  </tr>
                  
                  <!-- Body -->
                  <tr>
                    <td style="padding: 40px 30px; color: #333333; font-size: 16px; line-height: 1.6;">
                      <p style="margin-top: 0;">Olá, <strong>${name}</strong>,</p>
                      <p>Parabéns pela aquisição do material! Seu acesso à Área de Membros foi confirmado com sucesso.</p>
                      
                      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 25px 0;">
                        <p style="margin: 0 0 10px 0;"><strong>Detalhes da Compra:</strong></p>
                        <ul style="margin: 0; padding-left: 20px; color: #475569;">
                          <li><strong>Plano Atual:</strong> ${planToShow}</li>
                          <li><strong>E-mail de Acesso:</strong> ${email}</li>
                        </ul>
                      </div>

                      <div style="margin: 30px 0 25px 0; background-color: #fff9db; border-left: 4px solid #fcc419; padding: 15px; border-radius: 0 8px 8px 0; color: #664d03; font-size: 15px;">
                        <strong>⚠️ AVISO EXPLICITO:</strong> O seu login na Área de Membros é feito <strong>exclusivamente</strong> com o seu e-mail de compra (${email}). Não existe senha ou código de acesso.
                      </div>

                      <!-- Orderbump Cards -->
                      ${orderbumpHtml}

                      <!-- Call to Action Button -->
                      <div style="text-align: center; margin: 35px 0 20px 0;">
                        <a href="https://www.tecnicasbovino.hyzencompra.shop/area-de-membros/" target="_blank" style="background-color: #1e3f20; color: #ffffff; padding: 14px 30px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                          Acessar Área de Membros
                        </a>
                      </div>

                      <!-- Clickable link fallback -->
                      <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 25px; line-height: 1.4;">
                        Caso você não esteja conseguindo acessar apertando no botão acima, copie ou clique no link direto a seguir para acessar:<br>
                        <a href="https://www.tecnicasbovino.hyzencompra.shop/area-de-membros/" target="_blank" style="color: #1e3f20; text-decoration: underline; font-weight: 500;">
                          https://www.tecnicasbovino.hyzencompra.shop/area-de-membros/
                        </a>
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8fafc; padding: 25px 30px; text-align: center; color: #64748b; font-size: 13px; border-top: 1px solid #e2e8f0;">
                      <p style="margin: 0;">Suporte - +300 Técnicas de Identificação de Doenças Bovinas Ilustradas</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `

      const emailSubject = additionalItems.length > 0 && !purchasedTitles.some(t => t.toLowerCase().includes('300 técnicas'))
        ? "🎉 Seu material adicional foi liberado! - Área de Membros"
        : "Seu acesso à Área de Membros - +300 Técnicas de Identificação de Doenças Bovinas";

      let emailSent = false;

      // Try Resend first
      try {
        console.log("Tentando enviar e-mail via Resend...");
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + resendApiKey,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          },
          body: JSON.stringify({
            from: "Suporte <suporte@300tecnicasbovina.hyzencompra.shop>",
            to: email,
            subject: emailSubject,
            html: htmlContent
          })
        });

        const emailResult = await emailResponse.json();
        console.log("Resend API response:", emailResult);

        if (emailResponse.status === 200 || emailResponse.status === 201) {
          emailSent = true;
          console.log("E-mail enviado com sucesso via Resend!");
        } else {
          console.warn("Resend falhou com status:", emailResponse.status, emailResult);
        }
      } catch (err) {
        console.error("Erro ao enviar via Resend:", err);
      }

      // If Resend failed, try Brevo
      if (!emailSent) {
        try {
          console.log("Tentando enviar e-mail via Brevo (Fallback)...");
          const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
              "accept": "application/json",
              "api-key": brevoApiKey,
              "content-type": "application/json"
            },
            body: JSON.stringify({
              sender: {
                name: "Suporte",
                email: "suporte@300tecnicasbovina.hyzencompra.shop"
              },
              to: [
                {
                  email: email,
                  name: name
                }
              ],
              subject: emailSubject,
              htmlContent: htmlContent
            })
          });

          const brevoResult = await brevoResponse.json();
          console.log("Brevo API response:", brevoResult);

          if (brevoResponse.status === 200 || brevoResponse.status === 201) {
            emailSent = true;
            console.log("E-mail enviado com sucesso via Brevo!");
          } else {
            console.error("Brevo falhou com status:", brevoResponse.status, brevoResult);
          }
        } catch (err) {
          console.error("Erro ao enviar via Brevo:", err);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error("Erro no processamento do webhook:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
