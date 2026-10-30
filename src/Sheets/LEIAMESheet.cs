using Excel = Microsoft.Office.Interop.Excel;

namespace Vendas_eCommerce.Sheets
{
    // Code for one sheet, found by reflection and matched to the tab by SheetName.
    // This runs whether or not the panel is open.
    public class LEIAMESheet : SheetHandler
    {
        public override string SheetName => "LEIA-ME";

        public override void OnChange(Excel.Range target)
        {
            Diagnostics.Log(SheetName + " changed at " +
                target.Address[false, false, Excel.XlReferenceStyle.xlA1]);
        }

        public override void OnSelectionChange(Excel.Range target)
        {
        }

        public override void OnActivate()
        {
        }
    }
}
