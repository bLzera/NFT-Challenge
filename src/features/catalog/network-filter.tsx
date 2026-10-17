/**
 * Bloco "Rede" (A3): fiel ao Figma visualmente, porém não-funcional. O contrato `Nft` não tem
 * `network` e `ListNftsQuery` não aceita esse parâmetro — implementar filtragem aqui seria dado
 * fabricado (§11). A indisponibilidade é comunicada por um parágrafo visível (não por
 * `aria-disabled` no `fieldset`, que não propaga pra leitores de tela, nem por `title` num `<div>`
 * não-focável). Cada item de rede é um `<button disabled>` real — semântica nativa de "controle
 * indisponível", sem depender de atributos ARIA pra transmitir o estado (§8).
 */
export function NetworkFilter() {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-body-lg font-bold text-foreground">Rede</legend>
      <div className="flex flex-col gap-2 px-3">
        <p className="text-caption text-muted-foreground">
          Filtro por rede indisponível nesta demonstração.
        </p>
        {["Ethereum", "Polygon", "Solana"].map((network) => (
          <button
            key={network}
            type="button"
            disabled
            className="w-fit text-left text-body-sm text-secondary-text opacity-50 disabled:cursor-not-allowed"
          >
            {network}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
