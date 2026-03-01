import re

with open('src/pages/VMListPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the ToggleButtonGroup
toggle_pattern = re.compile(r'<ToggleButtonGroup.*?</ToggleButtonGroup>', re.DOTALL)
content = toggle_pattern.sub('', content)

# Remove ModernVMTable import
content = re.sub(r"import ModernVMTable from '../components/vm/ModernVMTable';\n", '', content)

# Replace the Content Area rendering logic
# find lines around: ) : isMobile || viewMode === 'grid' ? (
# and replace with just the Grid
render_pattern = re.compile(
    r'\) : isMobile \|\| viewMode === \'grid\' \? \(\s*<ModernVMGrid\s*vms=\{vms\}\s*getUsageColor=\{getUsageColor\}\s*formatUsage=\{formatUsage\}\s*formatStorage=\{formatStorage\}\s*/>\s*\)\s*:\s*\(\s*<ModernVMTable[^>]*/>\s*\)',
    re.DOTALL
)

new_render = """) : (
                    <ModernVMGrid
                        vms={vms}
                        getUsageColor={getUsageColor}
                        formatUsage={formatUsage}
                        formatStorage={formatStorage}
                    />
                )"""

content = render_pattern.sub(new_render, content)

# Change the component name
content = content.replace('export default function VMListPage() {', 'export default function VMListPage3() {')

# Remove viewMode state
content = re.sub(r"const \[viewMode, setViewMode\].*?;\n", '', content, flags=re.DOTALL)

with open('src/pages/VMListPage3.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

